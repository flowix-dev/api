import { executorRegistry } from "./registry";
import { NoopExecutor } from "./noop.executor";
import { DelayExecutor } from "./delay.executor";
import { SumExecutor } from "./sum.executor";
import { HttpRequestExecutor } from "./http-request.executor";
import { OpenAIChatExecutor } from "./openai-chat.executor";
import { EmailSendExecutor } from "./email-send.executor";
import { FileUploadExecutor } from "./file-upload.executor";
import { FileParserExecutor } from "./file-parser.executor";

executorRegistry.register("noop", () => new NoopExecutor());
executorRegistry.register("delay", () => new DelayExecutor());
executorRegistry.register("sum", () => new SumExecutor());
executorRegistry.register("http.request", () => new HttpRequestExecutor());
executorRegistry.register("openai.chat", () => new OpenAIChatExecutor());
executorRegistry.register("email.send", () => new EmailSendExecutor());
executorRegistry.register("file.upload", () => new FileUploadExecutor());
executorRegistry.register("file.parser", () => new FileParserExecutor());

export {
  executorRegistry,
  NoopExecutor,
  DelayExecutor,
  SumExecutor,
  HttpRequestExecutor,
  OpenAIChatExecutor,
  EmailSendExecutor,
  FileUploadExecutor,
  FileParserExecutor,
};
export type { INodeExecutor, ExecutorResult } from "./registry";
