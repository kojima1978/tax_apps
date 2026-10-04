import { describe, expect, it } from 'vitest';
import { exportFileName, warekiStamp } from './exportFileName';

const jst = (iso: string) => new Date(`${iso}T12:00:00+09:00`);

describe('warekiStamp', () => {
  it('元号1文字＋元号年2桁＋月2桁＋日2桁にする', () => {
    expect(warekiStamp(jst('2026-10-05'))).toBe('R081005');
  });

  it('元号年を0埋めする（しないと令和9年と令和10年の並びが入れ替わる）', () => {
    expect(warekiStamp(jst('2027-01-02'))).toBe('R090102');
    expect(warekiStamp(jst('2028-01-02'))).toBe('R100102');
  });

  it('改元日は元号が切り替わる（日付の表は持たず Intl に数えさせている）', () => {
    expect(warekiStamp(jst('1989-01-07'))).toBe('S640107');
    expect(warekiStamp(jst('1989-01-08'))).toBe('H010108');
    expect(warekiStamp(jst('2019-04-30'))).toBe('H310430');
    expect(warekiStamp(jst('2019-05-01'))).toBe('R010501');
  });

  it('日付は日本時間で数える（TZ が UTC でも前日にならない）', () => {
    // 日本時間 2026-10-05 00:30 は UTC では前日の 15:30。
    expect(warekiStamp(new Date('2026-10-04T15:30:00Z'))).toBe('R081005');
  });
});

describe('exportFileName', () => {
  it('和暦_名前_アプリ名の順に並べる', () => {
    expect(exportFileName(['山田太郎', '申告データ'], 'json', jst('2026-10-05')))
      .toBe('R081005_山田太郎_申告データ_相続税の申告書.json');
  });

  it('空の要素は落とす（被相続人の氏名を入れる前の控えでも段が空かない）', () => {
    expect(exportFileName(['', '申告データ'], 'json', jst('2026-10-05')))
      .toBe('R081005_申告データ_相続税の申告書.json');
  });

  it('ファイル名に使えない文字と区切りの_は名前から落とす', () => {
    expect(exportFileName('山田/太郎:A_B', 'json', jst('2026-10-05')))
      .toBe('R081005_山田太郎A B_相続税の申告書.json');
  });

  it('拡張子は先頭の.を付けても付けなくても同じ', () => {
    expect(exportFileName('退避データ', '.json', jst('2026-10-05')))
      .toBe('R081005_退避データ_相続税の申告書.json');
  });
});
