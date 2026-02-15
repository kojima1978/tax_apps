export function PageLayout({
  children,
  narrow,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-4 md:p-8">
      <div className={narrow ? "max-w-4xl mx-auto" : "max-w-6xl mx-auto"}>
        {children}
      </div>
    </div>
  );
}
