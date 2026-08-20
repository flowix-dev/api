import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";

const pendingEmails = new Map<
  string,
  {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }
>();

export function resolveEmailWait(workflowId: string, emailData: unknown): boolean {
  for (const [key, pending] of pendingEmails.entries()) {
    if (key.startsWith(workflowId)) {
      clearTimeout(pending.timeout);
      pending.resolve(emailData);
      pendingEmails.delete(key);
      return true;
    }
  }
  return false;
}

export class GmailTriggerExecutor implements INodeExecutor {
  async execute(
    node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const raw = context?.triggerData;
    if (raw) {
      let data: Record<string, unknown> = {};
      if (typeof raw === "string") {
        try {
          data = JSON.parse(raw);
        } catch {
          data = {};
        }
      } else if (typeof raw === "object" && raw !== null) {
        data = raw as Record<string, unknown>;
      }

      return {
        outputs: {
          from: data.from ?? "",
          subject: data.subject ?? "",
          body: data.body ?? "",
          date: data.date ?? "",
          attachments: data.attachments ?? [],
        },
      };
    }

    const timeout = Number(inputs.timeout ?? 300);
    const executionId = context?.workflowId ?? "unknown";

    if (!context) {
      throw new Error("ExecutionContext requerido para Gmail Trigger");
    }

    const result = await new Promise<unknown>((resolve, reject) => {
      const key = `${executionId}:${node.id}`;
      const timeoutMs = timeout * 1000;
      const timer = setTimeout(() => {
        pendingEmails.delete(key);
        reject(new Error(`Gmail Trigger timeout after ${timeout}s - no se recibió ningún email`));
      }, timeoutMs);

      pendingEmails.set(key, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout: timer,
      });
    });

    let data = result as Record<string, unknown>;

    return {
      outputs: {
        from: data.from ?? "",
        subject: data.subject ?? "",
        body: data.body ?? "",
        date: data.date ?? "",
        attachments: data.attachments ?? [],
      },
    };
  }
}
