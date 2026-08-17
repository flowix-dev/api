import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

const pendingWebhooks = new Map<
  string,
  {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }
>();

export function resolveWebhookWait(executionId: string, nodeId: number, data: unknown): boolean {
  const key = `${executionId}:${nodeId}`;
  const pending = pendingWebhooks.get(key);
  if (!pending) {
    return false;
  }
  clearTimeout(pending.timeout);
  pending.resolve(data);
  pendingWebhooks.delete(key);
  return true;
}

export function getPendingWebhookUrl(executionId: string, nodeId: number): string {
  return `/api/webhooks/${executionId}/${nodeId}`;
}

export class WebhookWaitExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const timeout = Number(inputs.timeout ?? 300);
    const executionId = context?.workflowId ?? "unknown";

    if (!context) {
      throw new Error("ExecutionContext requerido para Webhook Wait");
    }

    const result = await new Promise<unknown>((resolve, reject) => {
      const key = `${executionId}:${node.id}`;
      const timeoutMs = timeout * 1000;
      const timer = setTimeout(() => {
        pendingWebhooks.delete(key);
        reject(new Error(`Webhook Wait timeout after ${timeout}s`));
      }, timeoutMs);

      pendingWebhooks.set(key, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout: timer,
      });
    });

    let data = result;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data as string);
      } catch {
        // keep as string
      }
    }

    return {
      outputs: {
        data,
        receivedAt: new Date().toISOString(),
      },
    };
  }
}
