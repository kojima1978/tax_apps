import { ReactNode } from "react";

interface FormSectionHeaderProps {
  title: string;
  action?: ReactNode;
}

export function FormSectionHeader({ title, action }: FormSectionHeaderProps) {
  return (
    <div className={`flex items-center ${action ? "justify-between" : ""} pb-2 border-b border-blue-300`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          ✎
        </div>
        <h3 className="text-lg font-bold text-blue-900">{title}</h3>
      </div>
      {action}
    </div>
  );
}
