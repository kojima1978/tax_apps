// 共通ボタンスタイル定義（Tailwind クラス）

const BTN_BASE = 'flex items-center gap-2 whitespace-nowrap bg-white text-black border border-gray-300 transition-colors';
const HOVER = 'hover:bg-gray-200 hover:border-gray-400 cursor-pointer';
const BTN_CLASS = `${BTN_BASE} px-4 py-2 rounded-lg text-base font-medium`;
const SMALL_BTN_CLASS = `${BTN_BASE} text-sm px-4 py-2`;
const INLINE_BTN_CLASS = 'inline-flex items-center gap-1 whitespace-nowrap bg-white text-black border border-gray-300 transition-colors text-xs px-2 py-1 ml-2 rounded-md';

export const BTN = `${BTN_CLASS} ${HOVER}`;
export const SMALL_BTN = `${SMALL_BTN_CLASS} ${HOVER}`;
export const INLINE_BTN = `${INLINE_BTN_CLASS} ${HOVER}`;
