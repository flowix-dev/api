import { NodeDefinition } from "../models/NodeDefinition";
import { Workflow } from "../models/Workflow";
import { Credential } from "../models/Credential";
import { workflowService } from "../services/workflow.service";
import { resolveEmailWait } from "./executors/gmail-trigger.executor";

interface CheckedAccount {
  userId: string;
  provider: "gmail" | "outlook";
  lastCheckedAt: number;
  lastMessageId: string | null;
}

export class EmailTriggerManager {
  private timer: NodeJS.Timeout | null = null;
  private readonly checkedAccounts = new Map<string, CheckedAccount>();
  private readonly tickIntervalMs = 30000;
  private readonly lookbackMinutes = 5;

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        console.error("[email-trigger] Tick failed:", error);
      });
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.checkedAccounts.clear();
  }

  private async tick(): Promise<void> {
    const workflows = await Workflow.find().lean();
    if (workflows.length === 0) {
      return;
    }

    const nodeDefinitionIds = new Set<string>();
    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        nodeDefinitionIds.add(node.nodeDefinitionId.toString());
      }
    }

    const definitions = await NodeDefinition.find({
      _id: { $in: [...nodeDefinitionIds] },
    });
    const fnKeyByDefinitionId = new Map<string, string>();
    for (const definition of definitions) {
      fnKeyByDefinitionId.set(definition._id.toString(), definition.fnKey);
    }

    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        const fnKey = fnKeyByDefinitionId.get(node.nodeDefinitionId.toString());
        if (fnKey !== "gmail.trigger" && fnKey !== "outlook.trigger") {
          continue;
        }

        const provider = fnKey === "gmail.trigger" ? "gmail" : "outlook";
        const inputs = (node.inputs as Record<string, unknown> | undefined) ?? {};
        const credentialsId = inputs.credentials as string;

        if (!credentialsId) {
          continue;
        }

        try {
          await this.checkEmails(workflow, provider, credentialsId, fnKey);
        } catch (error) {
          console.error(
            `[email-trigger] Error checking emails for workflow ${workflow._id}:`,
            error
          );
        }
      }
    }
  }

  private async checkEmails(
    workflow: {
      _id: unknown;
      authorId: unknown;
      nodes: Array<{ id: number; inputs: Record<string, unknown> }>;
    },
    provider: "gmail" | "outlook",
    credentialsId: string,
    _fnKey: string
  ): Promise<void> {
    const workflowId = String(workflow._id);
    const authorId = String(workflow.authorId);
    const key = `${workflowId}:${credentialsId}`;
    const existing = this.checkedAccounts.get(key);

    const credential = await Credential.findOne({
      _id: credentialsId,
      authorId: authorId,
      provider,
    }).lean();

    if (!credential) {
      return;
    }

    const lastCheckedAt = existing?.lastCheckedAt ?? 0;
    const now = Date.now();

    const newMessages = await this.fetchNewEmails(provider, credential.accessToken, lastCheckedAt);

    if (newMessages.length === 0) {
      if (!existing) {
        this.checkedAccounts.set(key, {
          userId: authorId,
          provider,
          lastCheckedAt: now,
          lastMessageId: null,
        });
      } else {
        existing.lastCheckedAt = now;
      }
      return;
    }

    for (let i = 0; i < newMessages.length; i++) {
      const emailData = newMessages[i];
      const resolved = resolveEmailWait(workflowId, {
        from: emailData.from,
        subject: emailData.subject,
        body: emailData.body,
        date: emailData.date,
      });

      if (!resolved) {
        workflowService
          .runWorkflow(workflowId, authorId, {
            triggerData: {
              from: emailData.from,
              subject: emailData.subject,
              body: emailData.body,
              date: emailData.date,
            },
          })
          .catch((error) => {
            console.error(`[email-trigger] Run failed for workflow ${workflowId}:`, error);
          });
      }
    }

    this.checkedAccounts.set(key, {
      userId: authorId,
      provider,
      lastCheckedAt: now,
      lastMessageId: newMessages[0]?.id ?? null,
    });
  }

  private async fetchNewEmails(
    provider: "gmail" | "outlook",
    accessToken: string,
    lastCheckedAt: number
  ): Promise<Array<{ id: string; from: string; subject: string; body: string; date: string }>> {
    if (provider === "gmail") {
      return this.fetchGmailEmails(accessToken, lastCheckedAt);
    }
    return this.fetchOutlookEmails(accessToken, lastCheckedAt);
  }

  private async fetchGmailEmails(
    accessToken: string,
    lastCheckedAt: number
  ): Promise<Array<{ id: string; from: string; subject: string; body: string; date: string }>> {
    const afterDate = new Date(lastCheckedAt || Date.now() - this.lookbackMinutes * 60 * 1000);
    const query = `after:${Math.floor(afterDate.getTime() / 1000)}`;

    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      return [];
    }

    const listData = (await listResponse.json()) as {
      messages?: Array<{ id: string }>;
    };

    if (!listData.messages?.length) {
      return [];
    }

    const emails: Array<{ id: string; from: string; subject: string; body: string; date: string }> =
      [];

    for (const msg of listData.messages.slice(0, 5)) {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!msgResponse.ok) continue;

      const msgData = (await msgResponse.json()) as {
        id: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
        };
      };

      const headers = msgData.payload?.headers ?? [];
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const date = headers.find((h) => h.name === "Date")?.value ?? "";

      emails.push({
        id: msgData.id,
        from,
        subject,
        body: "",
        date,
      });
    }

    return emails;
  }

  private async fetchOutlookEmails(
    accessToken: string,
    lastCheckedAt: number
  ): Promise<Array<{ id: string; from: string; subject: string; body: string; date: string }>> {
    const afterDate = new Date(lastCheckedAt || Date.now() - this.lookbackMinutes * 60 * 1000);
    const filter = `receivedDateTime ge ${afterDate.toISOString()}`;

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=10&$orderby=receivedDateTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      value?: Array<{
        id: string;
        from?: { emailAddress?: { address?: string } };
        subject?: string;
        bodyPreview?: string;
        receivedDateTime?: string;
      }>;
    };

    if (!data.value?.length) {
      return [];
    }

    return data.value.map((msg) => ({
      id: msg.id,
      from: msg.from?.emailAddress?.address ?? "",
      subject: msg.subject ?? "",
      body: msg.bodyPreview ?? "",
      date: msg.receivedDateTime ?? "",
    }));
  }
}

export const emailTriggerManager = new EmailTriggerManager();
