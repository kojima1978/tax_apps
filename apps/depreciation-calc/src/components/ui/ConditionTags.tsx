type ConditionTagsProps = {
    tags: string[];
};

const ConditionTags = ({ tags }: ConditionTagsProps) => (
    <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag) => (
            <span key={tag} className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-600">
                {tag}
            </span>
        ))}
    </div>
);

export default ConditionTags;
