import { useEffect, useRef, useState } from 'react';
import { joinAddress, lookupZipAddress, splitAddress, zipDigits, type AddressParts } from '../zipAddress';
import { Field, inputClass } from './ui';

type Value = { postalCode: string; address: string };

// 郵便番号＋住所の入力欄。郵便番号が7桁そろうと「都道府県・市区町村・町域」が入り、
// 番地・建物名は下の欄に手で書く。保存は今までどおり住所1本（他のアプリが address を
// そのまま読むため）なので、2欄はつないで返し、読み込んだ住所は郵便番号で引き直して分ける。
export function AddressFields({ value, onChange }: { value: Value; onChange: (next: Value) => void }) {
  const [parts, setParts] = useState<AddressParts>({ area: value.address, rest: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'notFound'>('idle');
  // 自分が返した住所。親から来た住所がこれと違えば（読み込み直後など）分け直す
  const emitted = useRef<string | null>(null);

  useEffect(() => {
    if (value.address === emitted.current) return;
    setParts({ area: value.address, rest: '' });
    // 覚えるのは分け終えてから（開発時の StrictMode は effect を2回走らせ、1回目を
    // 打ち切る。先に覚えると2回目が「もう分けた」と読み飛ばして分からないままになる）
    let alive = true;
    void lookupZipAddress(value.postalCode).then((base) => {
      if (!alive) return;
      emitted.current = value.address;
      setParts(splitAddress(value.address, base));
    });
    return () => {
      alive = false;
    };
    // 郵便番号の打ち替えでは分け直さない（それは下の changeZip の仕事）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.address]);

  function emit(postalCode: string, next: AddressParts) {
    setParts(next);
    const address = joinAddress(next);
    emitted.current = address;
    onChange({ postalCode, address });
  }

  async function changeZip(postalCode: string) {
    onChange({ postalCode, address: emitted.current ?? value.address });
    if (zipDigits(postalCode).length !== 7) {
      setStatus('idle');
      return;
    }
    setStatus('loading');
    const base = await lookupZipAddress(postalCode);
    if (base === '') {
      setStatus('notFound');
      return;
    }
    setStatus('idle');
    // 番地・建物名は残す。上の欄だけ引いた住所で置き換える
    emit(postalCode, { ...parts, area: base });
  }

  const zipHint =
    status === 'loading' ? '住所を探しています…' : status === 'notFound' ? '該当する住所が見つかりません（手で入力してください）' : '7桁で住所が入ります';

  return (
    <div className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-3">
      <Field label="郵便番号" hint={zipHint}>
        <input
          className={inputClass}
          value={value.postalCode}
          onChange={(e) => void changeZip(e.target.value)}
          inputMode="numeric"
          placeholder="123-4567"
          autoComplete="postal-code"
        />
      </Field>
      <Field label="住所（都道府県・市区町村・町域）">
        <input
          className={inputClass}
          value={parts.area}
          onChange={(e) => emit(value.postalCode, { ...parts, area: e.target.value })}
        />
      </Field>
      <div className="col-start-2">
        <Field label="番地・建物名" hint="例: 1-2-3 ○○ビル4階">
          <input
            className={inputClass}
            value={parts.rest}
            onChange={(e) => emit(value.postalCode, { ...parts, rest: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
