interface PrintSectionProps {
  title: string;
  children: React.ReactNode;
}

export function PrintSection({ title, children }: PrintSectionProps) {
  return (
    <div className="border border-gray-300 p-2 page-break-inside-avoid">
      <h2 className="text-sm font-bold border-b border-gray-300 pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  );
}
