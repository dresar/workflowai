import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, showText = true, size = "md" }: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const icon = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner",
          dim,
        )}
      >
        <Sparkles size={icon} className="text-primary" />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">WorkflowAI</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Generator
          </div>
        </div>
      )}
    </div>
  );
}
