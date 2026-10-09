// 知らない URL のときの画面

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="text-xl font-bold">ページが見つかりません</h1>
      <Link to="/" className="btn btn-secondary mt-6">
        案件一覧へ
      </Link>
    </div>
  );
}
