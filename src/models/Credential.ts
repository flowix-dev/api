import { model, Schema } from "mongoose";
import { ICredential, CredentialProvider } from "../interfaces/Credential";

const credentialSchema = new Schema<ICredential>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["gmail", "outlook", "google"],
      index: true,
    },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    email: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

credentialSchema.index({ authorId: 1, provider: 1 }, { unique: true });

export const Credential = model<ICredential>("Credential", credentialSchema);
export type { CredentialProvider };
