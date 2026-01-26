import { ExternalLink, FileText } from 'lucide-react';

interface ExternalLinkButtonProps {
    href: string;
    label: string;
    description: string;
}

export function ExternalLinkButton({
    href,
    label,
    description,
}: ExternalLinkButtonProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center px-5 py-3 rounded-xl bg-emerald-800 bg-opacity-40 text-emerald-50 hover:bg-opacity-100 hover:text-white transition-all text-sm border border-emerald-600 hover:border-emerald-400 hover:shadow-lg"
        >
            <FileText className="w-5 h-5 mr-3 text-emerald-200 group-hover:text-white" />
            <span className="text-left">
                <span className="block text-xs text-emerald-300 group-hover:text-emerald-100 mb-0.5">
                    {description}
                </span>
                <span className="font-bold border-b border-transparent group-hover:border-white transition-colors">
                    {label}
                </span>
            </span>
            <ExternalLink className="w-4 h-4 ml-3 opacity-60 group-hover:opacity-100" />
        </a>
    );
}
