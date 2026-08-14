import { useEffect, useState } from 'react';
import { TAX_OFFICE_PREFS } from '../data/taxOffices';
import { lookupZipAddress } from '../lib/zipAddress';

/**
 * 郵便番号から都道府県名を求める（提出先税務署の候補を絞るために使う）。
 *
 * 同梱しているのは郵便番号→住所の対応表だけで、郵便番号→管轄税務署の対応表は持っていない。
 * そのため絞り込めるのは県までで、その中のどの署に出すかは利用者が選ぶ。
 * 住所は必ず都道府県名で始まるので、先頭一致で判定できる。
 */
export function useZipPrefecture(zip: string): string {
  const [pref, setPref] = useState('');
  useEffect(() => {
    let alive = true;
    void lookupZipAddress(zip).then((address) => {
      if (alive) setPref(TAX_OFFICE_PREFS.find((name) => address.startsWith(name)) ?? '');
    });
    return () => { alive = false; };
  }, [zip]);
  return pref;
}
