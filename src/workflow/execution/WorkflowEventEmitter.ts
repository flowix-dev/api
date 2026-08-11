export type WorkflowEvent =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "node.started"
  | "node.completed"
  | "node.failed"
  | "node.skipped";

export type WorkflowEventPayload = Record<string, unknown>;

export type EventListener = (payload: WorkflowEventPayload) => void;

export interface IWorkflowEventEmitter {
  on(event: WorkflowEvent, listener: EventListener): void;
  off(event: WorkflowEvent, listener: EventListener): void;
  emit(event: WorkflowEvent, payload: WorkflowEventPayload): void;
  removeAllListeners(event?: WorkflowEvent): void;
}

export class WorkflowEventEmitter implements IWorkflowEventEmitter {
  private readonly listeners = new Map<WorkflowEvent, Set<EventListener>>();

  on(event: WorkflowEvent, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: WorkflowEvent, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: WorkflowEvent, payload: WorkflowEventPayload): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(payload);
      }
    }
  }

  removeAllListeners(event?: WorkflowEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
