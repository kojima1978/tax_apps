import type { ConditionGroup } from '@/lib/print-conditions';

type Props = {
    groups: ConditionGroup[];
};

/**
 * 印刷専用の「入力条件」サマリ。
 * 画面の入力欄は紙に出さないので、実際に使った条件はここだけが記録になる。
 */
const PrintConditionList = ({ groups }: Props) => {
    if (groups.length === 0) return null;

    return (
        <section className="print-conditions print-only">
            <h2 className="print-block-title">入力条件</h2>
            {groups.map(({ title, rows }) => (
                <div key={title} className="print-condition-group">
                    <h3>{title}</h3>
                    <dl>
                        {rows.map(({ label, value }) => (
                            <div key={label} className="print-condition-row">
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}
        </section>
    );
};

export default PrintConditionList;
