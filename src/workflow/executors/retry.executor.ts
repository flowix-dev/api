import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { executorRegistry } from "./registry";
import { Types } from "mongoose";

export class RetryExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const nodeDefinitionId = String(inputs.nodeDefinitionId ?? "").trim();
    const maxRetries = Number(inputs.maxRetries ?? 3);
    const initialDelay = Number(inputs.initialDelay ?? 1);
    const maxDelay = Number(inputs.maxDelay ?? 30);
    const backoffMultiplier = Number(inputs.backoffMultiplier ?? 2);

    if (!nodeDefinitionId) {
      throw new Error("nodeDefinitionId es requerido (ID del nodo a reintentar)");
    }

    const retryInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (
        ![
          "nodeDefinitionId",
          "maxRetries",
          "initialDelay",
          "maxDelay",
          "backoffMultiplier",
        ].includes(key)
      ) {
        retryInputs[key] = value;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const executor = await executorRegistry.getExecutorForNode({
          ...node,
          nodeDefinitionId: new Types.ObjectId(nodeDefinitionId),
          inputs: retryInputs,
        });
        const result = await executor.execute(
          { ...node, nodeDefinitionId: new Types.ObjectId(nodeDefinitionId) },
          retryInputs,
          context
        );
        return {
          outputs: {
            ...result.outputs,
            attempts: attempt + 1,
            success: true,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }
      }
    }

    throw new Error(`Retry failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
  }
}
