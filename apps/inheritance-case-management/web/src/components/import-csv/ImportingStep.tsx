import { Square } from "lucide-react";
import { Button } from "../ui/Button";

interface ImportingStepProps {
  progress: number;
  total: number;
  onAbort: () => void;
}

export function ImportingStep({ progress, total, onAbort }: ImportingStepProps) {
  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-center">
        取り込み中... {progress} / {total}件
      </p>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="bg-primary h-2.5 rounded-full transition-all"
          style={{ width: `${(progress / total) * 100}%` }}
        />
      </div>
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={onAbort}>
          <Square className="mr-1.5 h-3 w-3" />
          中止
        </Button>
      </div>
    </div>
  );
}
