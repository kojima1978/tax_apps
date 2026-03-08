import AlertCircle from 'lucide-react/icons/alert-circle';

interface ValidationErrorPanelProps {
  show: boolean;
  errors: string[];
}

export const ValidationErrorPanel: React.FC<ValidationErrorPanelProps> = ({ show, errors }) => {
  if (!show || errors.length === 0) return null;
  return (
    <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        入力内容を確認してください
      </div>
      <ul className="text-red-600 text-sm ml-6 list-disc space-y-1">
        {errors.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>
    </div>
  );
};
