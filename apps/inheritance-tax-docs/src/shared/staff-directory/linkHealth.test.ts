// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { describe, expect, it } from 'vitest';
import { copyLinkTrouble, copyLinkTroubleMessage } from './linkHealth';

const body = {
  checks: [
    { app: 'private-banking', kind: 'workload', state: 'failed', since: '2026-11-12T10:00:00.000Z', reason: '500 が返りました' },
    { app: 'private-banking', kind: 'sync', state: 'failed', since: '2026-11-12T10:43:31.898Z', reason: '接続できませんでした' },
    { app: 'itcm', kind: 'sync', state: 'ok', since: null, reason: null },
  ],
};

describe('copyLinkTrouble', () => {
  it('そのアプリの写し（sync）が失敗しているときだけ返す。担当件数の失敗は見ない', () => {
    expect(copyLinkTrouble(body, 'private-banking')).toEqual({ since: '2026-11-12T10:43:31.898Z', reason: '接続できませんでした' });
    expect(copyLinkTrouble(body, 'itcm')).toBeNull();
  });

  it('読めない形は null（何も出さない）', () => {
    expect(copyLinkTrouble(null, 'itcm')).toBeNull();
    expect(copyLinkTrouble({ error: 'x' }, 'itcm')).toBeNull();
    expect(copyLinkTrouble({ checks: [null, 1] }, 'itcm')).toBeNull();
  });
});

describe('copyLinkTroubleMessage', () => {
  it('いつから（日本時間）と理由を1文で', () => {
    expect(copyLinkTroubleMessage({ since: '2026-11-12T10:43:31.898Z', reason: '接続できませんでした' })).toBe(
      '社員台帳からの写しが11/12 19:43から更新できていません（接続できませんでした）。入社・退職・異動が一覧に反映されていないことがあります。',
    );
    expect(copyLinkTroubleMessage({ since: '', reason: '' })).toBe('社員台帳からの写しが更新できていません。入社・退職・異動が一覧に反映されていないことがあります。');
  });
});
