import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

export class CounterExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const operation = String(inputs.operation ?? "increment");
    const step = Number(inputs.step ?? 1);
    const start = Number(inputs.start ?? 0);

    const current = (context?.getOutput(node.id, "__counterValue") as number) ?? start;
    let value: number;

    switch (operation) {
      case "increment":
        value = current + step;
        break;
      case "decrement":
        value = current - step;
        break;
      case "reset":
        value = start;
        break;
      case "set":
        value = step;
        break;
      default:
        value = current + step;
        break;
    }

    if (context) {
      context.setOutput(node.id, {
        __counterValue: value,
        ...(context.outputs.get(node.id) ?? {}),
      });
    }

    return {
      outputs: {
        value,
        previousValue: current,
        operation,
      },
    };
  }
}
