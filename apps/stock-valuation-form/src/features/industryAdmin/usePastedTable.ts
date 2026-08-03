import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  detectDelimiter,
  guessAssignment,
  splitPastedTable,
  type ColumnAssignment,
  type Delimiter,
  type FieldDef,
  type PastedTable,
} from './parsePastedTable';

export interface PastedTableState<K extends string> {
  text: string;
  setText: (text: string) => void;
  delimiter: Delimiter;
  setDelimiter: (delimiter: Delimiter) => void;
  /** 自動判定を使うか。ユーザーが区切りを選び直したら false になる。 */
  delimiterAuto: boolean;
  table: PastedTable;
  assignment: ColumnAssignment<K>;
  setColumn: (key: K, column: number | undefined) => void;
  clear: () => void;
}

/**
 * 貼り付けテキストの状態（本文・区切り・列の割り当て）をまとめて持つ。
 *
 * 区切りと列の割り当ては貼り付けるたびに推測し直すが、ユーザーが手で選び直した後は
 * その選択を尊重する（推測が外れる表を直したそばから上書きされると直せないため）。
 */
export function usePastedTable<K extends string>(
  fields: ReadonlyArray<FieldDef<K>>,
): PastedTableState<K> {
  const [text, setTextRaw] = useState('');
  const [delimiter, setDelimiterRaw] = useState<Delimiter>('tab');
  const [delimiterAuto, setDelimiterAuto] = useState(true);
  const [assignment, setAssignment] = useState<ColumnAssignment<K>>({});
  const [assignmentAuto, setAssignmentAuto] = useState(true);

  const table = useMemo(() => splitPastedTable(text, delimiter), [text, delimiter]);

  const setText = useCallback((next: string) => {
    setTextRaw(next);
    // 貼り替えたら推測をやり直す。
    setDelimiterAuto(true);
    setAssignmentAuto(true);
  }, []);

  const setDelimiter = useCallback((next: Delimiter) => {
    setDelimiterRaw(next);
    setDelimiterAuto(false);
    setAssignmentAuto(true); // 区切りが変われば列そのものが変わる
  }, []);

  useEffect(() => {
    if (delimiterAuto && text.trim() !== '') setDelimiterRaw(detectDelimiter(text));
  }, [delimiterAuto, text]);

  useEffect(() => {
    if (assignmentAuto) setAssignment(guessAssignment(table, fields));
  }, [assignmentAuto, table, fields]);

  const setColumn = useCallback((key: K, column: number | undefined) => {
    setAssignmentAuto(false);
    setAssignment((current) => {
      const next = { ...current };
      if (column === undefined) delete next[key];
      else next[key] = column;
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setTextRaw('');
    setAssignment({});
    setDelimiterAuto(true);
    setAssignmentAuto(true);
  }, []);

  return { text, setText, delimiter, setDelimiter, delimiterAuto, table, assignment, setColumn, clear };
}
