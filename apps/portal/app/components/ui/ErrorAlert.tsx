export default function ErrorAlert({ message, className }: {
  message: string;
  className?: string;
}) {
  return (
    <div className={`p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm ${className ?? ''}`}>
      {message}
    </div>
  );
}
