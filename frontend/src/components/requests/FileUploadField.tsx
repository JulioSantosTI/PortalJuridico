import * as React from "react";
import { Loader2, Paperclip, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadItem } from "@/hooks/useFileUpload";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  items,
  onAddFiles,
  onRemove,
  label = "Anexos (fotos, prints, PDF, Word...)",
}: {
  items: UploadItem[];
  onAddFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Paperclip /> Selecionar arquivos
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm",
                item.status === "error" && "border-destructive/40 bg-destructive/5"
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {item.status === "uploading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                {item.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                {item.status === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
                <span className="truncate">{item.file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatSize(item.file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Remover anexo"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
