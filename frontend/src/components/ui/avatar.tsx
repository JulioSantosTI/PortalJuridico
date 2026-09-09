import { cn, getInitials } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-24 w-24 text-2xl",
};

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={name} className={cn("rounded-full object-cover", SIZE_CLASSES[size], className)} />;
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground",
        SIZE_CLASSES[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
