const LINKS = [
  { label: '所得税の税率', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm' },
  { label: '基礎控除', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm' },
  { label: '給与所得控除', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm' },
  { label: '公的年金等の課税', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1600.htm' },
  { label: '一時所得', url: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1490.htm' },
];

export default function ReferenceLinks() {
  return (
    <div className="no-print text-center py-4">
      <p className="text-xs text-gray-400 mb-2">参考リンク（国税庁タックスアンサー）</p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {LINKS.map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        ※ この計算結果は概算です。正確な税額は税理士にご相談ください。
      </p>
    </div>
  );
}
