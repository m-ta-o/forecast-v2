
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ParameterInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  className?: string;
}

export function ParameterInput({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 0.1,
  prefix,
  className,
}: ParameterInputProps) {
  // Track input as string internally to allow empty field
  const [inputValue, setInputValue] = useState(value.toString());

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-gray-300">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => {
            // Just update the local input value - don't trigger simulation yet
            setInputValue(e.target.value);
          }}
          onKeyDown={(e) => {
            // Update on Enter key
            if (e.key === 'Enter') {
              const numValue = parseFloat(inputValue);
              if (!isNaN(numValue)) {
                onChange(numValue);
              }
              e.currentTarget.blur(); // Remove focus
            }
          }}
          onBlur={() => {
            // Update when they leave the field
            if (inputValue === '' || inputValue === '-') {
              const fallbackValue = min ?? 0;
              setInputValue(fallbackValue.toString());
              onChange(fallbackValue);
            } else {
              const numValue = parseFloat(inputValue);
              if (!isNaN(numValue)) {
                onChange(numValue);
              } else {
                // Invalid input - reset to current value
                setInputValue(value.toString());
              }
            }
          }}
          min={min}
          max={max}
          step={step}
          className={cn(
            "bg-gray-800 border-gray-700 text-white",
            prefix && "pl-8",
            unit && "pr-12"
          )}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
