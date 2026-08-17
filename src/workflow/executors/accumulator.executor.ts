import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

const ACCUMULATOR_KEY = "__accumulator";

export class AccumulatorExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const value = inputs.value;
    const operation = String(inputs.operation ?? "append");

    const existing = context?.getOutput(node.id, ACCUMULATOR_KEY);
    let items: unknown[] = Array.isArray(existing) ? [...existing] : [];

    switch (operation) {
      case "append":
        items.push(value);
        break;
      case "prepend":
        items.unshift(value);
        break;
      case "flatten":
        if (Array.isArray(value)) {
          items = items.concat(value);
        } else {
          items.push(value);
        }
        break;
      case "count":
        items.push(1);
        break;
      case "sum":
        items.push(Number(value) || 0);
        break;
      case "reset":
        items = [];
        break;
      default:
        items.push(value);
        break;
    }

    if (context) {
      context.setOutput(node.id, { [ACCUMULATOR_KEY]: items });
    }

    let result: unknown;
    switch (operation) {
      case "count":
        result = items.length;
        break;
      case "sum":
        result = items.reduce((a, b) => Number(a) + Number(b), 0);
        break;
      case "flatten":
      case "append":
      case "prepend":
      default:
        result = items;
        break;
    }

    return {
      outputs: {
        items,
        result,
        count: items.length,
      },
    };
  }
}
