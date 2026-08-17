import { model, Schema } from "mongoose";
import { IChatbot, IChatbotFile, IChatbotTool } from "../interfaces/Chatbot";

const ChatbotFileSchema = new Schema<IChatbotFile>(
  {
    key: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ChatbotToolSchema = new Schema<IChatbotTool>(
  {
    fnKey: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const chatbotSchema = new Schema<IChatbot>(
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
    avatarUrl: {
      type: String,
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
    temperature: {
      type: Number,
      min: 0,
      max: 2,
    },
    welcomeMessage: {
      type: String,
      trim: true,
    },
    placeholder: {
      type: String,
      trim: true,
    },
    allowFileUpload: {
      type: Boolean,
      default: false,
    },
    tools: {
      type: [ChatbotToolSchema],
      default: [],
    },
    primaryColor: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      enum: ["bottom-left", "bottom-right"],
      default: "bottom-right",
    },
    autoOpen: {
      type: Boolean,
      default: false,
    },
    showPoweredBy: {
      type: Boolean,
      default: true,
    },
    publicToken: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    allowedDomains: {
      type: [String],
      default: [],
    },
    files: {
      type: [ChatbotFileSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Chatbot = model<IChatbot>("Chatbot", chatbotSchema);
