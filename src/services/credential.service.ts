import { Credential } from "../models/Credential";
import { CredentialProvider } from "../interfaces/Credential";

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  profileUrl: string;
  refreshScope?: string;
}

const GOOGLE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

function getConfig(provider: CredentialProvider): ProviderConfig {
  if (provider === "gmail") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
      authorizeUrl: GOOGLE,
      tokenUrl: GOOGLE_TOKEN,
      scope: "https://www.googleapis.com/auth/gmail.send",
      profileUrl: "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    };
  }
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_REDIRECT_URI_GOOGLE || "",
      authorizeUrl: GOOGLE,
      tokenUrl: GOOGLE_TOKEN,
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/presentations",
        "https://www.googleapis.com/auth/drive.file",
      ].join(" "),
      profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      refreshScope: "offline_access",
    };
  }
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || "",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "Mail.Send offline_access User.Read",
    profileUrl: "https://graph.microsoft.com/v1.0/me",
  };
}

function assertConfigured(config: ProviderConfig): void {
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("El proveedor no está configurado. Revisá las variables de entorno.");
  }
}

export function buildAuthUrl(provider: CredentialProvider): string {
  const config = getConfig(provider);
  assertConfigured(config);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    access_type: "offline",
    prompt: "consent",
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

async function exchangeCode(
  provider: CredentialProvider,
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const config = getConfig(provider);
  assertConfigured(config);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    grant_type: "authorization_code",
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "OAuth exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresIn: data.expires_in ?? 3600,
  };
}

async function fetchEmail(provider: CredentialProvider, accessToken: string): Promise<string> {
  const config = getConfig(provider);
  const response = await fetch(config.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    emailAddress?: string;
    mail?: string;
    userPrincipalName?: string;
  };
  return data.emailAddress || data.mail || data.userPrincipalName || "";
}

async function refreshAccessToken(
  provider: CredentialProvider,
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const config = getConfig(provider);
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Token refresh failed");
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 3600 };
}

export async function handleCallback(
  userId: string,
  provider: CredentialProvider,
  code: string
): Promise<void> {
  const tokens = await exchangeCode(provider, code);
  const email = await fetchEmail(provider, tokens.accessToken);
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  await Credential.findOneAndUpdate(
    { authorId: userId, provider },
    {
      $set: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        expiresAt,
        email,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
}

export async function getCredentialStatus(
  userId: string,
  provider: CredentialProvider
): Promise<{ connected: boolean; email: string | null }> {
  const credential = await Credential.findOne({ authorId: userId, provider }).lean();
  return {
    connected: !!credential,
    email: credential?.email ?? null,
  };
}

export async function deleteCredential(
  userId: string,
  provider: CredentialProvider
): Promise<void> {
  await Credential.deleteOne({ authorId: userId, provider });
}

export async function getValidAccessToken(
  userId: string,
  provider: CredentialProvider
): Promise<{ accessToken: string; email: string }> {
  const credential = await Credential.findOne({ authorId: userId, provider });
  if (!credential) {
    throw new Error("Credenciales no conectadas");
  }

  const expired =
    credential.expiresAt === null || credential.expiresAt.getTime() - Date.now() < 60_000;

  if (expired && credential.refreshToken) {
    const refreshed = await refreshAccessToken(provider, credential.refreshToken);
    credential.accessToken = refreshed.accessToken;
    credential.expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
    await credential.save();
  }

  return { accessToken: credential.accessToken, email: credential.email };
}
