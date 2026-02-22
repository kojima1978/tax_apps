/**
 * リスト内で選択肢の重複を防止するフック
 * InsuranceContractList / CashGiftRecipientList 共通
 */
export function useUniqueOptions<T extends { id: string }>(
  items: T[],
  options: { id: string; label: string }[],
  getSelectedOptionId: (item: T) => string,
) {
  const allUsedIds = new Set(items.map(getSelectedOptionId));

  /** 次に追加可能な選択肢（未使用の先頭） */
  const nextAvailable = options.find(opt => !allUsedIds.has(opt.id)) ?? null;

  /** 追加ボタンの有効/無効 */
  const canAdd = nextAvailable !== null;

  /** 指定アイテム行のドロップダウンに表示する選択肢（自分以外が使用中のものを除外） */
  const getAvailableFor = (itemId: string) => {
    const usedByOthers = new Set(
      items.filter(i => i.id !== itemId).map(getSelectedOptionId),
    );
    return options.filter(opt => !usedByOthers.has(opt.id));
  };

  return { nextAvailable, canAdd, getAvailableFor };
}
