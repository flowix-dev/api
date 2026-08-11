import {
  SendMessageCommand,
  ReceiveMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import { INodeExecutor, ExecutorResult } from "./registry";
import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { getSQSClient } from "../../utils/sqs";

export class SQSMessageExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const action = (inputs.action as string) || "send";
    const queueUrl = (inputs.queueUrl as string) || "";
    const messageBody = (inputs.messageBody as string) || "";
    const queueName = (inputs.queueName as string) || "";

    const client = getSQSClient();

    switch (action) {
      case "send": {
        if (!queueUrl) throw new Error("queueUrl is required for send action");
        if (!messageBody) throw new Error("messageBody is required for send action");

        const cmd = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: messageBody,
        });
        const result = await client.send(cmd);
        return {
          outputs: {
            messageId: result.MessageId,
            md5OfBody: result.MD5OfMessageBody,
            sequenceNumber: result.SequenceNumber,
          },
        };
      }

      case "receive": {
        if (!queueUrl) throw new Error("queueUrl is required for receive action");

        const cmd = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 2,
        });
        const result = await client.send(cmd);

        const messages = (result.Messages || []).map((m) => ({
          messageId: m.MessageId,
          body: m.Body ? JSON.parse(m.Body) : null,
          receiptHandle: m.ReceiptHandle,
        }));

        return {
          outputs: {
            messages,
            count: messages.length,
          },
        };
      }

      case "create-queue": {
        if (!queueName) throw new Error("queueName is required for create-queue action");

        const cmd = new CreateQueueCommand({ QueueName: queueName });
        const result = await client.send(cmd);
        return {
          outputs: {
            queueUrl: result.QueueUrl,
          },
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
