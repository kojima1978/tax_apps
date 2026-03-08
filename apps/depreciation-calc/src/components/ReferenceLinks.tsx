type LinkItem = { label: string; url: string };

const LinkList = ({ links }: { links: LinkItem[] }) => (
    <ul className="list-none p-0 m-0">
        {links.map((link) => (
            <li key={link.url} className="py-1">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm hover:text-green-700">
                    {link.label}
                </a>
            </li>
        ))}
    </ul>
);

const PillLinks = ({ links }: { links: LinkItem[] }) => (
    <div className="flex flex-wrap gap-2">
        {links.map((link) => (
            <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-800 hover:bg-green-100 hover:border-green-400 transition-colors"
            >
                {link.label}
            </a>
        ))}
    </div>
);

const SECTIONS: { title: string; links: LinkItem[]; variant: 'list' | 'pill' }[] = [
    {
        title: '参照（中古耐用年数）',
        variant: 'list',
        links: [
            { label: '国税庁 No.5404 中古資産の耐用年数', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5404.htm' },
            { label: '国税庁 No.5404 中古資産の耐用年数（Q&A）', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5404_qa.htm' },
        ],
    },
    {
        title: '主な耐用年数表',
        variant: 'pill',
        links: [
            { label: '建物', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensutatemono.html' },
            { label: '構築物', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensukochiku.html' },
            { label: '車両運搬具', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensusharyo.html' },
            { label: '器具備品(1)', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensukigu1.html' },
            { label: '器具備品(2)', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensukigu2.html' },
            { label: '機械装置', url: 'https://www.keisan.nta.go.jp/r7yokuaru/aoiroshinkoku/hitsuyokeihi/genkashokyakuhi/taiyonensukikai.html' },
        ],
    },
    {
        title: '参照（減価償却）',
        variant: 'list',
        links: [
            { label: '国税庁 No.2100 減価償却のあらまし', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2100.htm' },
            { label: '国税庁 No.2105 旧定額法と旧定率法', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2105.htm' },
            { label: '国税庁 No.2106 定額法と定率法', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2106.htm' },
            { label: '償却率等表(PDF)', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/pdf/2100_02.pdf' },
        ],
    },
];

const ReferenceLinks = () => {
    return (
        <div className="p-4 sm:p-6 border-t border-gray-200">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                {SECTIONS.map(({ title, links, variant }, i) => (
                    <div key={title}>
                        <h3 className={`text-sm font-bold text-green-800 mb-2 m-0${i > 0 ? ' mt-3' : ''}`}>{title}</h3>
                        {variant === 'pill' ? <PillLinks links={links} /> : <LinkList links={links} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReferenceLinks;
