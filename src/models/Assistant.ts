import { model, Schema } from "mongoose";
import { IAssistant, IAssistantFile } from "../interfaces/Assistant";

const AssistantFileSchema = new Schema<IAssistantFile>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const assistantSchema = new Schema<IAssistant>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    systemPrompt: {
      type: String,
      required: [true, "System prompt is required"],
      trim: true,
    },
    model: {
      type: String,
      required: [true, "Model is required"],
      trim: true,
    },
    files: {
      type: [AssistantFileSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Assistant = model<IAssistant>("Assistant", assistantSchema);
