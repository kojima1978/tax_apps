import { describe, expect, it } from 'vitest';
import { FORM_GEOMETRY, PRINT_SAFE_BOTTOM_MM, printFitScale } from '@/components/ui/formGeometry';

// 第1表の1 は原本自体が紙の下端 1.8mm まで罫線のある様式で、こちらもそれに忠実に組んである。
// A4 には収まるが、プリンタの下端の印字不能域で最下段だけが消えるため、印刷のときだけ縮める。
// PDF に保存すると出てしまうので、実機で刷るまで気づけない ── ここで数字を固定しておく。

const bottomOf = (code: string) => {
  const { frame } = FORM_GEOMETRY[code]!;
  return frame.top + frame.height;
};

describe('印刷時に用紙へ収める倍率', () => {
  it('どの様式も縮めた後の下端が安全域に収まる（拡大は決してしない）', () => {
    for (const [code, geometry] of Object.entries(FORM_GEOMETRY)) {
      const scale = printFitScale(geometry);
      expect(scale, code).toBeLessThanOrEqual(1);
      expect(bottomOf(code) * scale, code).toBeLessThanOrEqual(PRINT_SAFE_BOTTOM_MM + 0.001);
    }
  });

  it('安全域に収まっている様式は等倍のまま（余計に縮めない）', () => {
    for (const [code, geometry] of Object.entries(FORM_GEOMETRY)) {
      if (bottomOf(code) <= PRINT_SAFE_BOTTOM_MM) expect(printFitScale(geometry), code).toBe(1);
    }
  });

  it('第1表の1（枠の下端295.2mm）は0.976倍になる', () => {
    const code = 'NTA0VNA170010010';
    expect(bottomOf(code)).toBeCloseTo(295.2, 1);
    expect(printFitScale(FORM_GEOMETRY[code]!)).toBeCloseTo(0.9756, 4);
  });

  it('上端は縮めても下がらない＝上側の印字不能域には食い込まない', () => {
    for (const [code, geometry] of Object.entries(FORM_GEOMETRY)) {
      const scale = printFitScale(geometry);
      const top = Math.min(geometry.frame.top, geometry.formCodeBox?.top ?? Infinity, geometry.qrBox?.top ?? Infinity);
      expect(top * scale, code).toBeLessThanOrEqual(top);
    }
  });
});
