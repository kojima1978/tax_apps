import { useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type ToastProps = {
    message: string;
    type?: 'success' | 'error';
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
};

export default function Toast({ 
    message, 
    type = 'success', 
    isVisible, 
    onClose, 
    duration = 3000 
}: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center p-4 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            type === 'success' 
                ? 'bg-white border-emerald-100 text-emerald-800' 
                : 'bg-white border-red-100 text-red-800'
        }`}>
            {type === 'success' ? (
                <CheckCircle className="w-5 h-5 mr-3 text-emerald-500" />
            ) : (
                <XCircle className="w-5 h-5 mr-3 text-red-500" />
            )}
            <span className="font-medium">{message}</span>
        </div>
    );
}
