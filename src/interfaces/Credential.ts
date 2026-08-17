import { Types } from "mongoose";

export type CredentialProvider = "gmail" | "outlook" | "google" | "slack" | "discord" | "whatsapp";

export interface ICredential {
  authorId: Types.ObjectId;
  provider: CredentialProvider;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date | null;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
