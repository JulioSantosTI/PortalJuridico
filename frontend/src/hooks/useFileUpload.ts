import * as React from "react";
import { uploadFile } from "@/api/uploads";
import type { AttachmentInput } from "@/lib/types";

export interface UploadItem {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  result?: AttachmentInput;
  error?: string;
}

export function useFileUpload(uploadFn: (file: File) => Promise<AttachmentInput> = uploadFile) {
  const [items, setItems] = React.useState<UploadItem[]>([]);

  const addFiles = React.useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      status: "uploading",
    }));
    setItems((prev) => [...prev, ...newItems]);

    newItems.forEach((item) => {
      uploadFn(item.file)
        .then((result) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "done", result } : i)));
        })
        .catch((err: Error) => {
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error", error: err.message } : i)));
        });
    });
  }, [uploadFn]);

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const reset = React.useCallback(() => setItems([]), []);

  const isUploading = items.some((i) => i.status === "uploading");
  const hasError = items.some((i) => i.status === "error");
  const attachments = items.filter((i) => i.status === "done" && i.result).map((i) => i.result as AttachmentInput);

  return { items, addFiles, removeItem, reset, isUploading, hasError, attachments };
}
