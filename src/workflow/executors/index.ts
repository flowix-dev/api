import { executorRegistry } from "./registry";
import { NoopExecutor } from "./noop.executor";
import { DelayExecutor } from "./delay.executor";
import { SumExecutor } from "./sum.executor";
import { HttpRequestExecutor } from "./http-request.executor";
import { OpenAIChatExecutor } from "./openai-chat.executor";
import { GmailSendExecutor } from "./gmail-send.executor";
import { OutlookSendExecutor } from "./outlook-send.executor";
import { StringifyExecutor } from "./stringify.executor";
import { ParseExecutor } from "./parse.executor";
import { GetValueExecutor } from "./get-value.executor";
import { FileUploadExecutor } from "./file-upload.executor";
import { FileParserExecutor } from "./file-parser.executor";

executorRegistry.register("noop", () => new NoopExecutor());
executorRegistry.register("delay", () => new DelayExecutor());
executorRegistry.register("sum", () => new SumExecutor());
executorRegistry.register("http.request", () => new HttpRequestExecutor());
executorRegistry.register("openai.chat", () => new OpenAIChatExecutor());
executorRegistry.register("gmail.send", () => new GmailSendExecutor());
executorRegistry.register("outlook.send", () => new OutlookSendExecutor());
executorRegistry.register("json.stringify", () => new StringifyExecutor());
executorRegistry.register("json.parse", () => new ParseExecutor());
executorRegistry.register("json.get", () => new GetValueExecutor());
executorRegistry.register("file.upload", () => new FileUploadExecutor());
executorRegistry.register("file.parser", () => new FileParserExecutor());

export {
  executorRegistry,
  NoopExecutor,
  DelayExecutor,
  SumExecutor,
  HttpRequestExecutor,
  OpenAIChatExecutor,
  GmailSendExecutor,
  OutlookSendExecutor,
  StringifyExecutor,
  ParseExecutor,
  GetValueExecutor,
  FileUploadExecutor,
  FileParserExecutor,
};
export type { INodeExecutor, ExecutorResult } from "./registry";
