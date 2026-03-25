
import React from "react";

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
}

export const ReportSection = ({ title, children }: ReportSectionProps) => {
  return (
    <div className="pt-4">
      <h3 className="font-bold text-sm mb-2 text-white border-b border-gray-700 pb-1">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
};
