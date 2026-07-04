import * as React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  /** Wartość jako ISO `YYYY-MM-DD` (zgodnie z dotychczasowymi inputami). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

/** ISO `YYYY-MM-DD` → Date w lokalnej strefie (bez przesunięcia UTC). */
function parseISO(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Date → ISO `YYYY-MM-DD` w lokalnej strefie. */
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Wybierz datę",
  id,
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISO(value);

  return (
    // Wrapper isolates base-ui's inline focus-guard <span>s (rendered as
    // siblings of the trigger when open) from any `space-y-*` on the parent
    // field — otherwise those spans get spacing margins and the form grows
    // every time the calendar opens.
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start gap-2 font-normal",
                !selected && "text-muted-foreground",
                className,
              )}
            >
              <CalendarIcon className="size-4 opacity-70" />
              {selected
                ? format(selected, "d MMM yyyy", { locale: pl })
                : placeholder}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            autoFocus
            onSelect={(date) => {
              if (date) onChange(toISO(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
