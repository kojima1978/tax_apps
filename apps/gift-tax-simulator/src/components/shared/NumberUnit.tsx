import { splitNumberUnit } from '@/lib/utils';

type Props = {
    /** 「1,000万円」のような単位付きの整形済み文字列 */
    text: string;
};

/** 数字を右詰め・単位を左揃えで並べる。行をまたいで単位の位置が揃う */
const NumberUnit = ({ text }: Props) => {
    const { value, unit } = splitNumberUnit(text);

    return (
        <span className="num-unit">
            <span className="num-unit-value">{value}</span>
            <span className="num-unit-suffix">{unit}</span>
        </span>
    );
};

export default NumberUnit;
