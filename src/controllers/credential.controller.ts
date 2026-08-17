import { Request, Response } from "express";
import {
  buildAuthUrl,
  deleteCredential,
  getCredentialStatus,
  handleCallback,
} from "../services/credential.service";
import { CredentialProvider } from "../interfaces/Credential";

function parseProvider(value: string | undefined): CredentialProvider | null {
  if (
    value === "gmail" ||
    value === "outlook" ||
    value === "google" ||
    value === "slack" ||
    value === "discord" ||
    value === "whatsapp"
  ) {
    return value;
  }
  return null;
}

export async function getAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const provider = parseProvider(req.params.provider as string);
    if (!provider) {
      res.status(400).json({ message: "Invalid provider" });
      return;
    }
    const url = buildAuthUrl(provider);
    res.json({ url });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to build auth URL",
    });
  }
}

export async function oauthCallback(req: Request, res: Response): Promise<void> {
  try {
    const provider = parseProvider(req.params.provider as string);
    const code = req.query.code as string | undefined;
    if (!provider || !code) {
      res.status(400).send("Missing provider or code");
      return;
    }
    await handleCallback(req.user!.userId, provider, code);
    res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/profile`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to connect account";
    res.status(400).send(message);
  }
}

export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    const provider = parseProvider(req.params.provider as string);
    if (!provider) {
      res.status(400).json({ message: "Invalid provider" });
      return;
    }
    const status = await getCredentialStatus(req.user!.userId, provider);
    res.json({ provider, ...status });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to get status",
    });
  }
}

export async function removeCredential(req: Request, res: Response): Promise<void> {
  try {
    const provider = parseProvider(req.params.provider as string);
    if (!provider) {
      res.status(400).json({ message: "Invalid provider" });
      return;
    }
    await deleteCredential(req.user!.userId, provider);
    res.json({ message: "Credential removed" });
  } catch (error: unknown) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to remove credential",
    });
  }
}
