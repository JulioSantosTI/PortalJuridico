import { FileText } from "lucide-react";

interface AttachmentLike {
  id: string;
  fileName: string;
  fileUrl?: string;
}

export function AttachmentList({ attachments }: { attachments: AttachmentLike[] }) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum anexo.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={attachment.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
