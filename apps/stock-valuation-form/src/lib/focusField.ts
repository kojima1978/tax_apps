/** 入力欄へ移動したことが分かるように、スクロール＋フォーカス＋一瞬ハイライトする */
export function focusAndFlash(el: HTMLElement): void {
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.focus();
  const prevShadow = el.style.boxShadow;
  const prevBg = el.style.background;
  el.style.boxShadow = 'inset 0 0 0 2px #2563eb';
  el.style.background = '#dbeafe';
  setTimeout(() => {
    el.style.boxShadow = prevShadow;
    el.style.background = prevBg;
  }, 1500);
}
