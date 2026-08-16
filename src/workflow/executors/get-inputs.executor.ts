import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class GetInputsExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const childInputs = context?.childInputs ?? {};
    const count = clampCount(inputs.count);

    const outputs: Record<string, unknown> = {};
    for (let i = 1; i <= count; i++) {
      outputs[`input${i}`] = childInputs[`input${i}`] ?? null;
    }
    return { outputs };
  }
}

function clampCount(raw: unknown): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 1;
}
