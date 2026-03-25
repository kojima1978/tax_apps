type CarryOverCtaProps = {
    description: string;
    buttonLabel: string;
    onClick: () => void;
};

const CarryOverCta = ({ description, buttonLabel, onClick }: CarryOverCtaProps) => (
    <div className="p-4 bg-green-50 border-2 border-dashed border-green-300 rounded-lg text-center mb-4 no-print">
        <p className="text-sm text-green-800 mb-2 m-0">{description}</p>
        <button
            type="button"
            onClick={onClick}
            className="px-6 py-2.5 bg-green-700 text-white text-sm font-bold rounded cursor-pointer transition-colors hover:bg-green-600"
        >
            {buttonLabel}
        </button>
    </div>
);

export default CarryOverCta;
