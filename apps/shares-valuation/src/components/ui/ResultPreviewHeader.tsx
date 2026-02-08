interface ResultPreviewHeaderProps {
  title: string;
  icon?: string;
  large?: boolean;
  className?: string;
}

export function ResultPreviewHeader({ title, icon = "✓", large = false, className }: ResultPreviewHeaderProps) {
  const sizeClass = large ? "w-8 h-8 font-bold" : "w-6 h-6 text-xs font-bold";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <div className={`${sizeClass} rounded-full bg-green-600 text-white flex items-center justify-center`}>
        {icon}
      </div>
      <h3 className={`${large ? "text-lg" : "text-sm"} font-bold text-green-900`}>{title}</h3>
    </div>
  );
}
