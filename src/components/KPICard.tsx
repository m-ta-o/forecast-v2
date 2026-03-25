
import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ className, title, value, prefix, suffix, trend, ...props }, ref) => {
    const formatNumber = (num: number): string => {
      if (typeof num !== "number" || !isFinite(num)) {
        return String(num);
      }

      return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    };

    const formattedValue = typeof value === "number" ? formatNumber(value) : value;

    return (
      <Card
        ref={ref}
        className={cn("bg-gray-800 border-gray-700 p-4", className)}
        {...props}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <div className="flex items-baseline space-x-1">
            {prefix && <span className="text-sm text-gray-400">{prefix}</span>}
            <p className="text-2xl font-bold text-white">{formattedValue}</p>
            {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
          </div>
        </div>
      </Card>
    );
  }
);
KPICard.displayName = "KPICard";

export default KPICard;
