// 段階5で順に作る画面の仮置き。全部できたら消す

import { Link } from 'react-router-dom';

export function PendingPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-500">
        この画面は移行作業中です。いまお使いの画面は{' '}
        <a className="text-blue-700 underline" href="/bank-analyzer/">
          /bank-analyzer/
        </a>{' '}
        です。
      </p>
      <Link to="/" className="btn btn-secondary mt-6">
        案件一覧へ
      </Link>
    </div>
  );
}

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
