import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type Option = {
    value: string | number;
    label: string;
};

type SearchableSelectProps = {
    options: Option[];
    value: string | number | '';
    onChange: (value: string | number) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
};

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = '選択してください',
    disabled = false,
    error = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (optionValue: string | number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={`w-full px-4 py-3.5 text-left bg-white border rounded-xl flex items-center justify-between transition-all outline-none
                    ${error
                        ? 'border-red-300 bg-red-50'
                        : isOpen
                            ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                            : 'border-slate-200 hover:border-emerald-400'
                    }
                    ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-900'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="検索..."
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                                見つかりませんでした
                            </div>
                        ) : (
                            <ul className="py-1" role="listbox">
                                {filteredOptions.map((option) => (
                                    <li
                                        key={option.value}
                                        role="option"
                                        aria-selected={option.value === value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors
                                            ${option.value === value
                                                ? 'bg-emerald-50 text-emerald-900 font-medium'
                                                : 'text-slate-700 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <span>{option.label}</span>
                                        {option.value === value && (
                                            <Check className="w-4 h-4 text-emerald-600" />
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
