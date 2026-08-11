export class ExecutionContext {
  readonly outputs: Map<number, Record<string, unknown>> = new Map();
  readonly executed: Set<number> = new Set();
  readonly running: Set<number> = new Set();
  readonly failed: Set<number> = new Set();
  readonly skipped: Set<number> = new Set();

  setOutput(nodeId: number, output: Record<string, unknown>): void {
    this.outputs.set(nodeId, output);
  }

  getOutput(nodeId: number, key: string): unknown | undefined {
    return this.outputs.get(nodeId)?.[key];
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
