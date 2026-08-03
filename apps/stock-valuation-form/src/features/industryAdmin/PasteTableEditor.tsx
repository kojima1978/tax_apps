import { DELIMITER_LABELS, type Delimiter, type FieldDef } from './parsePastedTable';
import type { PastedTableState } from './usePastedTable';

const DELIMITERS = Object.keys(DELIMITER_LABELS) as Delimiter[];

/** 列の見本。先頭の数行だけ出して、割り当てが正しいかを目で確かめられるようにする。 */
const SAMPLE_ROWS = 3;

interface Props<K extends string> {
  state: PastedTableState<K>;
  fields: ReadonlyArray<FieldDef<K>>;
  placeholder: string;
}

export function PasteTableEditor<K extends string>({ state, fields, placeholder }: Props<K>) {
  const { text, setText, delimiter, setDelimiter, delimiterAuto, table, assignment, setColumn } = state;
  const columns = Array.from({ length: table.columnCount }, (_, index) => index);

  return (
    <div className="admin-paste">
      <textarea
        className="admin-paste-area"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        rows={8}
      />

      {table.rows.length > 0 && (
        <>
          <div className="admin-row">
            <label className="admin-label">
              区切り
              <select
                className="admin-select"
                value={delimiter}
                onChange={(event) => setDelimiter(event.target.value as Delimiter)}
              >
                {DELIMITERS.map((key) => (
                  <option key={key} value={key}>{DELIMITER_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <span className="admin-note">
              {delimiterAuto ? '自動判定' : '手動指定'} ／ {table.rows.length}行 × {table.columnCount}列
            </span>
          </div>

          <div className="admin-assign">
            {fields.map((field) => (
              <label key={field.key} className="admin-label">
                {field.label}{field.required && <span className="admin-required">必須</span>}
                <select
                  className="admin-select"
                  value={assignment[field.key] ?? ''}
                  onChange={(event) =>
                    setColumn(field.key, event.target.value === '' ? undefined : Number(event.target.value))
                  }
                >
                  <option value="">（使わない）</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>{column + 1}列目</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  {columns.map((column) => {
                    const assigned = fields.find((field) => assignment[field.key] === column);
                    return (
                      <th key={column}>
                        {column + 1}列目
                        {assigned && <div className="admin-assigned">{assigned.label}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {table.rows.slice(0, SAMPLE_ROWS).map((row) => (
                  <tr key={row.line}>
                    {columns.map((column) => (
                      <td key={column}>{row.cells[column] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
