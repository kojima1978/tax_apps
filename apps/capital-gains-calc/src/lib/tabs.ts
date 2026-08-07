/** タブ定義。コンポーネント側と分けているのは Fast Refresh の制約による */
export type TabKey = 'real-estate' | 'securities';

export type TabItem = {
    key: TabKey;
    label: string;
    description: string;
};

export const TABS: TabItem[] = [
    { key: 'real-estate', label: '不動産', description: '土地・建物の譲渡（分離課税）' },
    { key: 'securities', label: '株式等', description: '上場株式等・一般株式等（分離課税）' },
];
