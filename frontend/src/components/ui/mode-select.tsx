import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Adapted from shadcn's root-toggle/RootSelect pattern: same trigger + popover-list-
// of-options shape, but for picking an in-page value (a mode) rather than navigating
// to a route, so options fire onSelect instead of rendering as <Link>s.
export interface ModeSelectOption {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

interface ModeSelectProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect" | "value"> {
  options: ModeSelectOption[];
  value?: string | null;
  placeholder: React.ReactNode;
  onSelect?: (value: string) => void;
}

export function ModeSelect({ options, value, placeholder, onSelect, className, ...props }: ModeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-none bg-lime px-5 font-sans text-sm font-medium text-night transition-colors hover:bg-lime/85",
            className,
          )}
          {...props}
        >
          {selected ? selected.title : placeholder}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="max-h-80 w-[min(19rem,calc(100vw-3rem))] overflow-y-auto rounded-none border-light-line bg-night p-0 text-paper shadow-lg"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { onSelect?.(option.value); setOpen(false); }}
            className={cn(
              "flex w-full items-start gap-2 border-b border-light-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-forest hover:text-paper",
              option.value === value && "bg-forest/60",
            )}
          >
            {option.icon}
            <span className="flex-1">
              <span className="block font-display text-lg">{option.title}</span>
              {option.description && (
                <span className="mt-1 block font-sans text-xs font-normal leading-snug text-paper/70">{option.description}</span>
              )}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
