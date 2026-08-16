import { model, Schema } from "mongoose";
import { IWorkflowChatMessage } from "../interfaces/WorkflowChat";

const workflowChatToolCallSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    arguments: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
    status: { type: String, enum: ["completed", "failed"], required: true },
  },
  { _id: false }
);

const workflowChatMessageSchema = new Schema<IWorkflowChatMessage>(
  {
    workflowId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Workflow",
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    toolCalls: {
      type: [workflowChatToolCallSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const WorkflowChatMessage = model<IWorkflowChatMessage>(
  "WorkflowChatMessage",
  workflowChatMessageSchema
);
