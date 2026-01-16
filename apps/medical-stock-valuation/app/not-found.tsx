import Link from 'next/link';
import { Home } from 'lucide-react';
import Button from '@/components/Button';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">404 - Page Not Found</h2>
            <p className="text-gray-600 mb-8">お探しのページは見つかりませんでした。</p>
            <Link href="/">
                <Button className="px-6 py-2 flex items-center gap-2">
                    <Home size={20} />
                    トップページへ戻る
                </Button>
            </Link>
        </div>
    );
}
