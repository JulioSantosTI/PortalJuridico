import { apiRequest } from "./client";
import type { AttachmentInput } from "@/lib/types";

interface PresignResponse {
  uploadUrl: string;
  storageKey: string;
  fileUrl: string;
}

export async function uploadFile(file: File): Promise<AttachmentInput> {
  const presign = await apiRequest<PresignResponse>("/uploads/presign", {
    method: "POST",
    body: { fileName: file.name, mimeType: file.type || "application/octet-stream" },
  });

  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`Falha ao enviar o arquivo "${file.name}"`);
  }

  return {
    storageKey: presign.storageKey,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
