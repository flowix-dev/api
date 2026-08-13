import { model, Schema } from "mongoose";
import { IChatFile } from "../interfaces/ChatFile";

const chatFileSchema = new Schema<IChatFile>(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    s3Key: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const ChatFile = model<IChatFile>("ChatFile", chatFileSchema);
