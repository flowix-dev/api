import { executorRegistry } from "./registry";
import { NoopExecutor } from "./noop.executor";
import { DelayExecutor } from "./delay.executor";
import { MathOperationExecutor } from "./math-operation.executor";
import { HttpRequestExecutor } from "./http-request.executor";
import { AiChatExecutor } from "./ai-chat.executor";
import { AiAssistantExecutor } from "./ai-assistant.executor";
import { GmailSendExecutor } from "./gmail-send.executor";
import { OutlookSendExecutor } from "./outlook-send.executor";
import { StringifyExecutor } from "./stringify.executor";
import { ParseExecutor } from "./parse.executor";
import { GetValueExecutor } from "./get-value.executor";
import { ArrayGetExecutor } from "./array-get.executor";
import { ArrayAggregateExecutor } from "./array-aggregate.executor";
import { ArrayLengthExecutor } from "./array-length.executor";
import { ArrayOperationsExecutor } from "./array-operations.executor";
import { TextOperationsExecutor } from "./text-operations.executor";
import { TemplateExecutor } from "./template.executor";
import { ObjectOperationsExecutor } from "./object-operations.executor";
import { SlackSendExecutor } from "./slack-send.executor";
import { DiscordSendExecutor } from "./discord-send.executor";
import { TelegramSendExecutor } from "./telegram-send.executor";
import { AirtableListExecutor } from "./airtable-list.executor";
import { AirtableAppendExecutor } from "./airtable-append.executor";
import { NotionCreatePageExecutor } from "./notion-create-page.executor";
import { GoogleSheetsExecutor } from "./google-sheets.executor";
import { GoogleDocsExecutor } from "./google-docs.executor";
import { GoogleSlidesExecutor } from "./google-slides.executor";
import { MongoQueryExecutor } from "./mongo-query.executor";
import { PostgresQueryExecutor } from "./postgres-query.executor";
import { MysqlQueryExecutor } from "./mysql-query.executor";
import { WebhookTriggerExecutor } from "./webhook-trigger.executor";
import { ScheduleTriggerExecutor } from "./schedule-trigger.executor";
import { SlackTriggerExecutor } from "./slack-trigger.executor";
import { DiscordTriggerExecutor } from "./discord-trigger.executor";
import { GmailTriggerExecutor } from "./gmail-trigger.executor";
import { OutlookTriggerExecutor } from "./outlook-trigger.executor";
import { WhatsAppSendExecutor } from "./whatsapp-send.executor";
import { WhatsAppTriggerExecutor } from "./whatsapp-trigger.executor";
import { RunWorkflowExecutor } from "./run-workflow.executor";
import { CreateWorkflowExecutor } from "./create-workflow.executor";
import { ListWorkflowsExecutor } from "./list-workflows.executor";
import { GetInputsExecutor } from "./get-inputs.executor";
import { SendOutputsExecutor } from "./send-outputs.executor";
import { IfElseExecutor } from "./if-else.executor";
import { OrGateExecutor } from "./or-gate.executor";
import { SwitchExecutor } from "./switch.executor";
import { ReturnEndExecutor } from "./return-end.executor";
import { TryCatchExecutor } from "./try-catch.executor";
import { FileUploadExecutor } from "./file-upload.executor";
import { FileParserExecutor } from "./file-parser.executor";

executorRegistry.register("noop", () => new NoopExecutor());
executorRegistry.register("delay", () => new DelayExecutor());
executorRegistry.register("math.operation", () => new MathOperationExecutor());
executorRegistry.register("http.request", () => new HttpRequestExecutor());
executorRegistry.register("ai.chat", () => new AiChatExecutor());
executorRegistry.register("ai.assistant", () => new AiAssistantExecutor());
executorRegistry.register("gmail.send", () => new GmailSendExecutor());
executorRegistry.register("outlook.send", () => new OutlookSendExecutor());
executorRegistry.register("json.stringify", () => new StringifyExecutor());
executorRegistry.register("json.parse", () => new ParseExecutor());
executorRegistry.register("json.get", () => new GetValueExecutor());
executorRegistry.register("array.get", () => new ArrayGetExecutor());
executorRegistry.register("array.aggregate", () => new ArrayAggregateExecutor());
executorRegistry.register("array.length", () => new ArrayLengthExecutor());
executorRegistry.register("array.operations", () => new ArrayOperationsExecutor());
executorRegistry.register("text.operations", () => new TextOperationsExecutor());
executorRegistry.register("template.render", () => new TemplateExecutor());
executorRegistry.register("object.operations", () => new ObjectOperationsExecutor());
executorRegistry.register("slack.send", () => new SlackSendExecutor());
executorRegistry.register("discord.send", () => new DiscordSendExecutor());
executorRegistry.register("telegram.send", () => new TelegramSendExecutor());
executorRegistry.register("airtable.list", () => new AirtableListExecutor());
executorRegistry.register("airtable.append", () => new AirtableAppendExecutor());
executorRegistry.register("notion.createPage", () => new NotionCreatePageExecutor());
executorRegistry.register("google.sheets", () => new GoogleSheetsExecutor());
executorRegistry.register("google.docs", () => new GoogleDocsExecutor());
executorRegistry.register("google.slides", () => new GoogleSlidesExecutor());
executorRegistry.register("mongo.query", () => new MongoQueryExecutor());
executorRegistry.register("postgres.query", () => new PostgresQueryExecutor());
executorRegistry.register("mysql.query", () => new MysqlQueryExecutor());
executorRegistry.register("webhook.trigger", () => new WebhookTriggerExecutor());
executorRegistry.register("schedule.trigger", () => new ScheduleTriggerExecutor());
executorRegistry.register("slack.trigger", () => new SlackTriggerExecutor());
executorRegistry.register("discord.trigger", () => new DiscordTriggerExecutor());
executorRegistry.register("gmail.trigger", () => new GmailTriggerExecutor());
executorRegistry.register("outlook.trigger", () => new OutlookTriggerExecutor());
executorRegistry.register("whatsapp.send", () => new WhatsAppSendExecutor());
executorRegistry.register("whatsapp.trigger", () => new WhatsAppTriggerExecutor());
executorRegistry.register("run.workflow", () => new RunWorkflowExecutor());
executorRegistry.register("create.workflow", () => new CreateWorkflowExecutor());
executorRegistry.register("list.workflows", () => new ListWorkflowsExecutor());
executorRegistry.register("get.inputs", () => new GetInputsExecutor());
executorRegistry.register("send.outputs", () => new SendOutputsExecutor());
executorRegistry.register("if.else", () => new IfElseExecutor());
executorRegistry.register("or.gate", () => new OrGateExecutor());
executorRegistry.register("switch", () => new SwitchExecutor());
executorRegistry.register("return.end", () => new ReturnEndExecutor());
executorRegistry.register("try.catch", () => new TryCatchExecutor());
executorRegistry.register("file.upload", () => new FileUploadExecutor());
executorRegistry.register("file.parser", () => new FileParserExecutor());

export {
  executorRegistry,
  NoopExecutor,
  DelayExecutor,
  MathOperationExecutor,
  HttpRequestExecutor,
  AiChatExecutor,
  AiAssistantExecutor,
  GmailSendExecutor,
  OutlookSendExecutor,
  StringifyExecutor,
  ParseExecutor,
  GetValueExecutor,
  ArrayGetExecutor,
  ArrayAggregateExecutor,
  ArrayLengthExecutor,
  ArrayOperationsExecutor,
  TextOperationsExecutor,
  TemplateExecutor,
  ObjectOperationsExecutor,
  SlackSendExecutor,
  DiscordSendExecutor,
  TelegramSendExecutor,
  AirtableListExecutor,
  AirtableAppendExecutor,
  NotionCreatePageExecutor,
  GoogleSheetsExecutor,
  GoogleDocsExecutor,
  GoogleSlidesExecutor,
  MongoQueryExecutor,
  PostgresQueryExecutor,
  MysqlQueryExecutor,
  WebhookTriggerExecutor,
  ScheduleTriggerExecutor,
  SlackTriggerExecutor,
  DiscordTriggerExecutor,
  GmailTriggerExecutor,
  OutlookTriggerExecutor,
  WhatsAppSendExecutor,
  WhatsAppTriggerExecutor,
  RunWorkflowExecutor,
  CreateWorkflowExecutor,
  ListWorkflowsExecutor,
  GetInputsExecutor,
  SendOutputsExecutor,
  IfElseExecutor,
  OrGateExecutor,
  SwitchExecutor,
  ReturnEndExecutor,
  TryCatchExecutor,
  FileUploadExecutor,
  FileParserExecutor,
};
export type { INodeExecutor, ExecutorResult } from "./registry";
