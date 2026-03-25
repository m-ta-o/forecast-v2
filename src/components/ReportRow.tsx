
import { cn } from "@/lib/utils";
import React from "react";

interface ReportRowProps {
  label: string | React.ReactNode;
  values: (string | number | React.ReactNode)[];
  isHeader?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: boolean;
  isMuted?: boolean;
}

export const ReportRow = ({ label, values, isHeader, isSubtotal, isTotal, indent, isMuted }: ReportRowProps) => {
  const rowClasses = cn(
    "grid grid-cols-6 gap-2 py-1 items-center border-b border-gray-800",
    isHeader && "font-bold border-b-2 border-gray-600 pb-2 mb-1",
    isSubtotal && "bg-gray-800/50 font-medium",
    isTotal && "bg-gray-700/80 font-bold text-white mt-1",
  );
  const labelClasses = cn("text-xs", indent && "pl-4", isMuted && "text-gray-400 pl-4");

  return (
    <div className={rowClasses}>
      <div className={labelClasses}>{label}</div>
      {values.map((value, index) => (
        <div key={index} className="text-center text-xs">
          {value}
        </div>
      ))}
    </div>
  );
};
