import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
}

export function InfoTooltip({ content, className, iconClassName }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Mais informações"
            className={`cursor-help inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-muted/50 ${className || ""}`}
          >
            <HelpCircle
              className={`h-4 w-4 text-muted-foreground hover:text-primary transition-colors ${iconClassName || ""}`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] p-3 text-sm animate-in fade-in zoom-in-95 duration-200">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
