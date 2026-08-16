export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export class ExecutionContext {
  readonly outputs: Map<number, Record<string, unknown>> = new Map();
  readonly inactiveOutputs: Map<number, Set<string>> = new Map();
  readonly executed: Set<number> = new Set();
  readonly running: Set<number> = new Set();
  readonly failed: Set<number> = new Set();
  readonly skipped: Set<number> = new Set();
  readonly caught: Set<number> = new Set();

  private halted = false;
  private haltResult: unknown = null;

  workflowId = "";
  userId = "";
  uploadedFile: UploadedFile | null = null;
  puterToken: string | null = null;
  triggerData: unknown = null;
  childInputs: Record<string, unknown> | null = null;
  readonly uploadedFiles: Map<number, UploadedFile> = new Map();

  setOutput(nodeId: number, output: Record<string, unknown>): void {
    this.outputs.set(nodeId, output);
  }

  getOutput(nodeId: number, key: string): unknown | undefined {
    return this.outputs.get(nodeId)?.[key];
  }

  setInactiveOutputs(nodeId: number, keys: string[]): void {
    this.inactiveOutputs.set(nodeId, new Set(keys));
  }

  isOutputInactive(nodeId: number, key: string): boolean {
    return this.inactiveOutputs.get(nodeId)?.has(key) ?? false;
  }

  markExecuted(nodeId: number): void {
    this.executed.add(nodeId);
    this.running.delete(nodeId);
  }

  markRunning(nodeId: number): void {
    this.running.add(nodeId);
  }

  markFailed(nodeId: number): void {
    this.failed.add(nodeId);
    this.running.delete(nodeId);
  }

  markSkipped(nodeId: number): void {
    this.skipped.add(nodeId);
  }

  markCaught(nodeId: number): void {
    this.caught.add(nodeId);
  }

  isCaught(nodeId: number): boolean {
    return this.caught.has(nodeId);
  }

  halt(value?: unknown): void {
    this.halted = true;
    this.haltResult = value;
  }

  get isHalted(): boolean {
    return this.halted;
  }

  get haltValue(): unknown {
    return this.haltResult;
  }

  isExecuted(nodeId: number): boolean {
    return this.executed.has(nodeId);
  }

  isRunning(nodeId: number): boolean {
    return this.running.has(nodeId);
  }

  isFailed(nodeId: number): boolean {
    return this.failed.has(nodeId);
  }

  get allCompleted(): boolean {
    return this.running.size === 0 && this.failed.size > 0
      ? this.executed.size + this.failed.size + this.skipped.size ===
          this.outputs.size + this.failed.size + this.skipped.size
      : false;
  }
}
