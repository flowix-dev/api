import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class NumberFormatterExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const value = Number(inputs.value ?? 0);
    const format = String(inputs.format ?? "decimal");
    const decimals = Number(inputs.decimals ?? 2);
    const currency = String(inputs.currency ?? "USD");
    const locale = String(inputs.locale ?? "en-US");

    let formatted: string;

    switch (format) {
      case "currency":
        formatted = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
        break;
      case "percentage":
        formatted = new Intl.NumberFormat(locale, {
          style: "percent",
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value / 100);
        break;
      case "compact":
        formatted = new Intl.NumberFormat(locale, {
          notation: "compact",
          maximumFractionDigits: decimals,
        }).format(value);
        break;
      case "scientific":
        formatted = new Intl.NumberFormat(locale, {
          notation: "scientific",
          maximumFractionDigits: decimals,
        }).format(value);
        break;
      default:
        formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(value);
        break;
    }

    return {
      outputs: {
        formatted,
        value,
        format,
      },
    };
  }
}
