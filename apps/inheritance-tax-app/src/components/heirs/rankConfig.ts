export type RankConfig = {
  rankKey: 'rank1Children' | 'rank3Siblings';
  selectedRank: 'rank1' | 'rank3';
  primaryType: string;
  representativeType: string;
  sectionTitle: string;
  primaryLabel: string;
  representativeLabel: string;
};

export const RANK1_CONFIG: RankConfig = {
  rankKey: 'rank1Children',
  selectedRank: 'rank1',
  primaryType: 'child',
  representativeType: 'grandchild',
  sectionTitle: '第1順位：子供',
  primaryLabel: '子',
  representativeLabel: '孫',
};

export const RANK3_CONFIG: RankConfig = {
  rankKey: 'rank3Siblings',
  selectedRank: 'rank3',
  primaryType: 'sibling',
  representativeType: 'nephew_niece',
  sectionTitle: '第3順位：兄弟姉妹（2割加算）',
  primaryLabel: '兄弟姉妹',
  representativeLabel: '甥姪',
};
