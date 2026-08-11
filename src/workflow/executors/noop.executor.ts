import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

/**
 * Default no-op executor for nodes without a specific implementation.
 * Returns the inputs as outputs, useful for testing and as a fallback.
 */
export class NoopExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    return { outputs: { ...inputs, result: "executed" } };
  }
}
