import { useMemo, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { searchMutualFunds } from "@/lib/mutual-funds";
import { cn } from "@/lib/utils";

interface FundAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function FundAutocomplete({ value, onChange, placeholder, className }: FundAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchMutualFunds(value), [value]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        placeholder={placeholder ?? "Type mutual fund name or code..."}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-[200] w-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No funds found.</p>
          ) : (
            results.map((fund) => (
              <div
                key={fund.code}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(fund.name);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{fund.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">({fund.code})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
