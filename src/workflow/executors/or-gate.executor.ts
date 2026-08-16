import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

const INPUT_KEYS = ["input1", "input2", "input3", "input4"];

export class OrGateExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    let value: unknown = null;
    for (const key of INPUT_KEYS) {
      if (inputs[key] !== undefined && inputs[key] !== null) {
        value = inputs[key];
        break;
      }
    }
    return { outputs: { value } };
  }
}
