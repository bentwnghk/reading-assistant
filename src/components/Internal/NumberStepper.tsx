"use client";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/style";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: NumberStepperProps) {
  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const handleDecrement = () => {
    if (disabled) return;
    onChange(clamp(value - step));
  };

  const handleIncrement = () => {
    if (disabled) return;
    onChange(clamp(value + step));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    } else if (e.target.value === "") {
      onChange(min);
    }
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed)) {
      onChange(min);
    } else {
      onChange(clamp(parsed));
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="decrement"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "h-7 w-[52px] text-center text-sm font-medium px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          inputClassName,
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="increment"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default NumberStepper;
