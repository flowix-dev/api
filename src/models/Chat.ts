import { model, Schema } from "mongoose";
import { IChat } from "../interfaces/Chat";

const chatSchema = new Schema<IChat>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    title: {
      type: String,
      required: [true, "Chat title is required"],
      trim: true,
      maxlength: [120, "Title must be at most 120 characters"],
    },
    model: {
      type: String,
      required: [true, "Chat model is required"],
      trim: true,
    },
    assistantId: {
      type: Schema.Types.ObjectId,
      ref: "Assistant",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

chatSchema.index({ authorId: 1, updatedAt: -1 });

export const Chat = model<IChat>("Chat", chatSchema);
