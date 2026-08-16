import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class SendOutputsExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const outputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (/^output\d+$/.test(key)) {
        outputs[key] = value;
      }
    }
    return { outputs };
  }
}
