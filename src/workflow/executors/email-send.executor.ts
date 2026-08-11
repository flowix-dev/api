import nodemailer from "nodemailer";
import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export class EmailSendExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const to = (inputs.to as string) || "";
    const subject = (inputs.subject as string) || "";
    const body = (inputs.body as string) || "";
    const from = (inputs.from as string) || process.env.SMTP_FROM || "noreply@flowix.com";

    if (!to || !subject || !body) {
      throw new Error("to, subject, and body are required");
    }

    const info = await transporter.sendMail({
      from: `"Flowix" <${from}>`,
      to,
      subject,
      html: body,
    });

    return {
      outputs: {
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId,
        response: info.response,
      },
    };
  }
}
