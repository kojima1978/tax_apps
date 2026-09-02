import { describe, expect, it } from 'vitest';
import { FORM_QR, QR_SIZE } from '../data/formQr';
import { formQrModules, formQrPath } from './qrPath';

/** (x, y) のモジュールが暗いか */
const at = (bits: boolean[], x: number, y: number) => bits[y * QR_SIZE + x];

describe('様式のQRコード', () => {
  it('全様式が29×29に戻る', () => {
    expect(Object.keys(FORM_QR)).toHaveLength(24);
    for (const code of Object.keys(FORM_QR)) {
      expect(formQrModules(code)).toHaveLength(QR_SIZE * QR_SIZE);
    }
  });

  it('3隅のファインダパターンが規格どおり', () => {
    for (const code of Object.keys(FORM_QR)) {
      const bits = formQrModules(code)!;
      for (const [oy, ox] of [[0, 0], [0, QR_SIZE - 7], [QR_SIZE - 7, 0]]) {
        for (let j = 0; j < 7; j += 1) {
          for (let i = 0; i < 7; i += 1) {
            const dark = j === 0 || j === 6 || i === 0 || i === 6 || (j >= 2 && j <= 4 && i >= 2 && i <= 4);
            expect(at(bits, ox! + i, oy! + j)).toBe(dark);
          }
        }
      }
    }
  });

  it('タイミングパターンが交互に並ぶ', () => {
    for (const code of Object.keys(FORM_QR)) {
      const bits = formQrModules(code)!;
      for (let i = 8; i < QR_SIZE - 8; i += 1) {
        expect(at(bits, i, 6)).toBe(i % 2 === 0);
        expect(at(bits, 6, i)).toBe(i % 2 === 0);
      }
    }
  });

  it('パスを展開するとモジュールに戻る', () => {
    for (const code of Object.keys(FORM_QR)) {
      const back = new Array<boolean>(QR_SIZE * QR_SIZE).fill(false);
      for (const [, x, y, w] of formQrPath(code)!.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
        for (let i = 0; i < Number(w); i += 1) back[Number(y) * QR_SIZE + Number(x) + i] = true;
      }
      expect(back).toEqual(formQrModules(code));
    }
  });

  it('QRを持たない様式IDは null', () => {
    expect(formQrPath('NTA0KSE999999999')).toBeNull();
  });
});
