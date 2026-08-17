import { Types } from "mongoose";

export interface IChatbotFile {
  key: string;
  name: string;
  type: string;
  size: number;
}

export interface IChatbotTool {
  fnKey: string;
  name: string;
}

export interface IChatbot {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  name: string;
  avatarUrl?: string;
  systemPrompt: string;
  model: string;
  temperature?: number;
  welcomeMessage?: string;
  placeholder?: string;
  allowFileUpload: boolean;
  tools: IChatbotTool[];
  primaryColor?: string;
  position: "bottom-left" | "bottom-right";
  autoOpen: boolean;
  showPoweredBy: boolean;
  publicToken: string;
  allowedDomains: string[];
  files: IChatbotFile[];
  createdAt: Date;
  updatedAt: Date;
}
