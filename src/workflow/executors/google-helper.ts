const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

export async function listDriveFiles(
  accessToken: string,
  mimeType: string
): Promise<Array<Record<string, unknown>>> {
  const query = new URLSearchParams({
    q: `mimeType='${mimeType}' and trashed=false`,
    fields: "files(id,name,mimeType,createdTime,modifiedTime)",
    pageSize: "100",
  });
  const response = await fetch(`${DRIVE_API}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    files?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(data.error?.message || "Google Drive list failed");
  }
  return data.files ?? [];
}
