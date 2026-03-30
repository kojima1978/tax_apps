interface Props {
  totalEmp: number;
  totalEmpDisplay: string;
}

export function EmployeeClass({ totalEmp, totalEmpDisplay }: Props) {
  return (
    <table className="gov-table" style={{ fontSize: 8.5, tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '50%' }} />
        <col style={{ width: '50%' }} />
      </colgroup>
      <tbody>
        <tr>
          <td rowSpan={2} style={{ padding: '2px 4px' }}>
            ㋣　直前期末以前１年間における従業員数に応ずる区分
          </td>
          <td className={totalEmp >= 70 && totalEmpDisplay ? 'gov-choice selected' : ''} style={{ padding: '2px 8px' }}>
            70人以上の会社は、大会社（㋠及び㋷は不要）
          </td>
        </tr>
        <tr>
          <td className={totalEmp < 70 && totalEmpDisplay ? 'gov-choice selected' : ''} style={{ padding: '2px 8px' }}>
            70人未満の会社は、㋠及び㋷により判定
          </td>
        </tr>
      </tbody>
    </table>
  );
}
