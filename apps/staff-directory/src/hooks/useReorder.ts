import { useState, type DragEvent, type KeyboardEvent } from 'react';

// 一覧をドラッグ（またはつまみにフォーカスして ↑↓）で並べ替え、「保存」で確定するための状態。
// 保存するまではサーバへ何も送らない。並べた順は id の配列で持つ。
//
// ドラッグはブラウザ標準の HTML5 drag & drop で足りる（数十行の表で、タッチ操作は想定しない）。
// 行全体を draggable にすると入力欄の文字選択までドラッグに化けるので、掴めるのはつまみだけにする
// （「押したら行を draggable に」は再描画が間に合わず、文字選択になることがあった）。
export function useReorder<T extends { id: number }>(items: T[]) {
  const [order, setOrder] = useState<number[] | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // 一覧が読み直されて行が増減したら、手元の並びは捨てる（古い並びで保存させない）
  const valid =
    order !== null && order.length === items.length && items.every((it) => order.includes(it.id));
  const byId = new Map(items.map((it) => [it.id, it]));
  const sorted = valid ? order.map((id) => byId.get(id)!) : items;
  const dirty = valid && order.some((id, i) => id !== items[i].id);

  function moveTo(id: number, target: number) {
    const ids = sorted.map((it) => it.id);
    const from = ids.indexOf(id);
    if (from < 0 || target < 0 || target >= ids.length || from === target) return;
    ids.splice(from, 1);
    ids.splice(target, 0, id);
    setOrder(ids);
  }

  // 行は「上を通ったら入れ替える」受け側だけ。掴むのはつまみ（handleProps）
  const rowProps = (id: number) => ({
    onDragOver: (e: DragEvent) => {
      if (dragging === null) return;
      e.preventDefault();
      if (dragging !== id) moveTo(dragging, sorted.findIndex((it) => it.id === id));
    },
    onDrop: (e: DragEvent) => e.preventDefault(),
  });

  const handleProps = (id: number, label: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(id));
      // 掴んでいる見た目はつまみではなく行ごとにする
      const row = e.currentTarget.closest('tr');
      if (row) e.dataTransfer.setDragImage(row, 20, row.offsetHeight / 2);
      setDragging(id);
    },
    onDragEnd: () => setDragging(null),
    onKeyDown: (e: KeyboardEvent) => {
      const index = sorted.findIndex((it) => it.id === id);
      if (e.key === 'ArrowUp') moveTo(id, index - 1);
      else if (e.key === 'ArrowDown') moveTo(id, index + 1);
      else return;
      e.preventDefault();
    },
    'aria-label': `${label}を並べ替える（↑↓キーでも動かせます）`,
  });

  return {
    sorted,
    dirty,
    draggingId: dragging,
    ids: sorted.map((it) => it.id),
    reset: () => setOrder(null),
    rowProps,
    handleProps,
  };
}
