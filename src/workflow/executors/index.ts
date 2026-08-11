import { executorRegistry } from "./registry";
import { NoopExecutor } from "./noop.executor";
import { DelayExecutor } from "./delay.executor";
import { SumExecutor } from "./sum.executor";
import { HttpRequestExecutor } from "./http-request.executor";
import { OpenAIChatExecutor } from "./openai-chat.executor";
import { EmailSendExecutor } from "./email-send.executor";
import { S3StorageExecutor } from "./s3-storage.executor";
import { SQSMessageExecutor } from "./sqs-message.executor";

executorRegistry.register("noop", () => new NoopExecutor());
executorRegistry.register("delay", () => new DelayExecutor());
executorRegistry.register("sum", () => new SumExecutor());
executorRegistry.register("http.request", () => new HttpRequestExecutor());
executorRegistry.register("openai.chat", () => new OpenAIChatExecutor());
executorRegistry.register("email.send", () => new EmailSendExecutor());
executorRegistry.register("s3.storage", () => new S3StorageExecutor());
executorRegistry.register("sqs.message", () => new SQSMessageExecutor());

export {
  executorRegistry,
  NoopExecutor,
  DelayExecutor,
  SumExecutor,
  HttpRequestExecutor,
  OpenAIChatExecutor,
  EmailSendExecutor,
  S3StorageExecutor,
  SQSMessageExecutor,
};
export type { INodeExecutor, ExecutorResult } from "./registry";
