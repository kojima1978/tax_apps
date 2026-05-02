export function formatPersonDeleteBlockedMessage(caseCount: number, role: '相続人' | '関係者' = '相続人'): string {
  return `この人物は${caseCount}件の案件で${role}として使用されているため、削除できません。関連する案件からこの人物を外してから削除してください。今後の選択肢から隠すだけなら、削除ではなく「無効化」を使用してください。`;
}
