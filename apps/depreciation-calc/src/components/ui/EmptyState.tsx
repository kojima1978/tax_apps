type EmptyStateProps = {
    icon: string;
    lines: string[];
};

const EmptyState = ({ icon, lines }: EmptyStateProps) => (
    <div className="flex items-center justify-center py-8">
        <div className="text-center text-gray-400">
            <div className="text-5xl mb-2">{icon}</div>
            {lines.map((line) => (
                <p key={line} className="text-sm my-1">{line}</p>
            ))}
            <p className="text-xs text-gray-300 mt-2">Ctrl+Enter でも計算できます</p>
        </div>
    </div>
);

export default EmptyState;
