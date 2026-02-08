interface FormErrorDisplayProps {
    error: string | null;
}

export default function FormErrorDisplay({ error }: FormErrorDisplayProps) {
    if (!error) return null;

    return (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start animate-in fade-in slide-in-from-top-2">
            <div className="mr-3 mt-0.5 text-xl">⚠️</div>
            <div>
                <h3 className="font-bold text-sm mb-1">エラーが発生しました</h3>
                <p className="text-sm">{error}</p>
            </div>
        </div>
    );
}
