'use client';

import { CheckCircle2, List, ChevronRight } from 'lucide-react';
import { taxReturnData } from '@/data/taxReturnData';

interface MenuScreenProps {
  onStartCheck: () => void;
  onShowAll: () => void;
}

export default function MenuScreen({ onStartCheck, onShowAll }: MenuScreenProps) {
  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
      <header className="bg-blue-600 p-10 text-center text-white">
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-blue-100 text-lg">申告内容に合わせて、ご用意いただく書類をご案内します。</p>
      </header>
      <div className="p-10">
        <h2 className="text-xl font-semibold text-center mb-10 text-slate-600">
          ご希望の案内方法を選択してください
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <button
            onClick={onStartCheck}
            className="group relative flex flex-col items-center p-8 bg-white border-2 border-blue-100 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-center w-full"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <CheckCircle2 className="w-10 h-10 text-blue-600 group-hover:text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">質問に答えて選ぶ</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              「事業をしている」「医療費控除がある」などの質問に答えて、
              <br />
              <span className="font-bold text-blue-600">お客様専用のリスト</span>を作成します。
            </p>
            <div className="mt-8 flex items-center px-6 py-2 bg-blue-50 text-blue-700 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              スタート <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>

          <button
            onClick={onShowAll}
            className="group relative flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:border-slate-500 hover:shadow-xl transition-all duration-300 text-center w-full"
          >
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-slate-600 transition-colors">
              <List className="w-10 h-10 text-slate-600 group-hover:text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">全リストを表示</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              網羅的なリストが必要な場合に、
              <br />
              <span className="font-bold text-slate-600">すべての必要書類一覧</span>を表示・印刷します。
            </p>
            <div className="mt-8 flex items-center px-6 py-2 bg-slate-50 text-slate-700 rounded-full font-bold group-hover:bg-slate-600 group-hover:text-white transition-colors">
              一覧を見る <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
