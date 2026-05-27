import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
          <div className={`cursor-help inline-flex items-center justify-center rounded-full transition-colors hover:bg-muted/50 p-1 ${className || ""}`}>
            <HelpCircle className={`h-4 w-4 text-muted-foreground hover:text-primary transition-colors ${iconClassName || ""}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] p-3 text-sm animate-in fade-in zoom-in-95 duration-200">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
