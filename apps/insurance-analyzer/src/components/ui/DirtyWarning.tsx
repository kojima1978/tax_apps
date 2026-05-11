const DirtyWarning = ({ isDirty }: { isDirty: boolean }) => {
    if (!isDirty) return null;
    return (
        <div className="p-3 bg-orange-50 border border-orange-500 rounded text-orange-600 text-sm font-semibold mb-4 no-print">
            入力値が変更されています。再計算してください。
        </div>
    );
};

export default DirtyWarning;
