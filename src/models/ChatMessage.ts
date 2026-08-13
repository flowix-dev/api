import { model, Schema } from "mongoose";
import { IAttachment, IChatMessage, IToolCall } from "../interfaces/ChatMessage";

const AttachmentSchema = new Schema<IAttachment>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    s3Key: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ToolCallSchema = new Schema<IToolCall>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    arguments: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["completed", "failed"],
    },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Chat",
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
      required: true,
      enum: ["user", "assistant"],
    },
    content: {
      type: String,
      required: true,
      default: "",
    },
    attachments: {
      type: [AttachmentSchema],
      default: [],
    },
    toolCalls: {
      type: [ToolCallSchema],
      default: [],
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ chatId: 1, createdAt: 1 });

export const ChatMessage = model<IChatMessage>("ChatMessage", chatMessageSchema);
