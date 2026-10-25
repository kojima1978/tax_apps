import { describe, expect, it } from 'vitest';
import { buildSheets, type PowerOfAttorneyInput, type PrincipalInput, type SheetRow } from './record';
import { INHERITANCE_MATTERS, resolveMatters, togglePreset } from './matters';
import { parseStaffPersonal } from './subAgent';

const person: PrincipalInput = {
  kind: 'individual',
  address: '架空県架空市1-2-3',
  name: '架空花子',
  representative: '',
  birthDate: '昭和45年3月2日',
};

const corporation: PrincipalInput = {
  kind: 'corporate',
  address: '架空県架空市4-5-6',
  name: '株式会社架空',
  representative: '代表取締役 架空一郎',
  birthDate: '昭和50年1月1日',
};

const base = (overrides: Partial<PowerOfAttorneyInput> = {}): PowerOfAttorneyInput => ({
  purpose: 'inheritance',
  documents: 'both',
  printDetails: true,
  nameMode: 'printed',
  deceased: { name: '架空太郎', birthDate: '昭和10年4月5日' },
  principals: [person],
  matters: ['事項A'],
  date: '令和8年10月25日',
  agent: { name: '架空税理士法人', address: '架空県架空市7-8-9', representative: '代表社員 架空次郎' },
  subAgent: { name: '架空三郎', address: '架空県架空市10', birthDate: '平成2年6月7日' },
  ...overrides,
});

const row = (rows: SheetRow[], label: string) => rows.find((r) => r.label === label);

describe('buildSheets', () => {
  it('委任者ごとに 委任状 → 復代理委任状 の順で並べる', () => {
    const sheets = buildSheets(base({ principals: [person, corporation] }));
    expect(sheets.map((s) => s.title)).toEqual(['委任状（原本還付希望）', '復代理委任状', '委任状（原本還付希望）', '復代理委任状']);
  });

  it('委任状: 受任者は 法人名　代表、見出しに被相続人', () => {
    const [sheet] = buildSheets(base());
    expect(row(sheet.upperRows, '法人名・代表')?.value).toBe('架空税理士法人　代表社員 架空次郎');
    expect(sheet.matterHeading).toBe('１．被相続人　架空太郎（昭和10年4月5日生）の相続手続きに関する下記の権限');
    expect(sheet.principalHeading).toBe('【委任者（相続人及び受遺者）】');
    expect(row(sheet.principalRows, '氏名')).toMatchObject({ value: '架空花子', seal: '（印）' });
    expect(sheet.closingItems).toHaveLength(2);
  });

  it('被相続人と日付が空なら手書きの空白で刷る', () => {
    const [sheet] = buildSheets(base({ deceased: { name: '', birthDate: '' }, date: '' }));
    expect(sheet.matterHeading).toBe('１．被相続人　　　　　　　　　　（　　　年　　　月　　　日生）の相続手続きに関する下記の権限');
    expect(sheet.date).toBe('令和　　　年　　　月　　　日');
  });

  it('法人の委任者: 法人名と代表者を刷り、生年月日の行を出さず、社印の注記', () => {
    const [principal, sub] = buildSheets(base({ principals: [corporation], nameMode: 'signature' }));
    expect(principal.principalRows.map((r) => r.label)).toEqual(['住所', '氏名']);
    expect(row(principal.principalRows, '氏名')).toMatchObject({
      value: '株式会社架空　代表取締役 架空一郎',
      seal: '（社印）',
      sealNote: '法人名の入った社印を押印してください',
    });
    expect(sub.delegation[0]).toContain('委任者　株式会社架空　代表取締役 架空一郎　より');
  });

  it('署名にすると個人の氏名は空欄（行は残す）', () => {
    const [principal, sub] = buildSheets(base({ nameMode: 'signature' }));
    expect(row(principal.principalRows, '氏名')?.value).toBe('');
    expect(sub.delegation[0]).toContain('委任者　　　　　　　　　　　より');
  });

  it('住所・生年月日を空欄にできる', () => {
    const [principal] = buildSheets(base({ printDetails: false }));
    expect(row(principal.principalRows, '住所')?.value).toBe('');
    expect(row(principal.principalRows, '生年月日')?.value).toBe('');
  });

  it('復代理委任状だけなら個人の氏名は自署（印字にしていても刷らない）', () => {
    const sheets = buildSheets(base({ documents: 'subdelegate' }));
    expect(sheets.map((s) => s.title)).toEqual(['復代理委任状']);
    expect(row(sheets[0].principalRows, '氏名')?.value).toBe('');
  });

  it('委任状だけなら復代理委任状を作らない', () => {
    expect(buildSheets(base({ documents: 'principal' })).map((s) => s.title)).toEqual(['委任状（原本還付希望）']);
  });

  it('復代理委任状: 復代理人・代理人の実印・受任会社名の本文', () => {
    const [, sub] = buildSheets(base());
    expect(sub.upperRows.map((r) => r.value)).toEqual(['架空県架空市10', '架空三郎', '平成2年6月7日']);
    expect(sub.delegation[0]).toBe(
      '私は、委任者　架空花子　より受任した権限に基づき、架空税理士法人　の職員である上記の者を復代理人と定め、下記事項を委任します。',
    );
    expect(sub.principalHeading).toBe('【本来の委任者（相続人）】');
    expect(row(sub.principalRows, '氏名')?.seal).toBeUndefined();
    expect(sub.agentRows?.[1]).toMatchObject({ value: '架空税理士法人　代表社員 架空次郎', seal: '（実印）' });
    expect(sub.closingItems).toEqual(['２．本委任状の原本還付請求及び受領に関する一切の権限']);
  });

  it('復代理人を選んでいなければ空欄で刷る', () => {
    const [, sub] = buildSheets(base({ subAgent: null }));
    expect(sub.upperRows.map((r) => r.value)).toEqual(['', '', '　　　年　　　月　　　日']);
  });

  it('本人用: 見出しは委任者本人、法人なら（法人）', () => {
    const [principal, sub] = buildSheets(base({ purpose: 'personal' }));
    expect(principal.matterHeading).toBe('１．委任者本人の不動産証明の取得に関する下記の権限');
    expect(principal.principalHeading).toBe('【委任者（本人）】');
    expect(sub.principalHeading).toBe('【本来の委任者（本人）】');
    const [corp] = buildSheets(base({ purpose: 'personal', principals: [corporation] }));
    expect(corp.principalHeading).toBe('【委任者（法人）】');
  });
});

describe('委任事項', () => {
  it('ひな形の並びで刷り、直した文面を優先し、その他は1行1事項', () => {
    const [first, second] = INHERITANCE_MATTERS;
    const matters = resolveMatters(
      'inheritance',
      { [second.id]: { checked: true, text: '' }, [first.id]: { checked: true, text: '  直した文面 ' } },
      'その他1\n\n その他2 ',
    );
    expect(matters).toEqual(['直した文面', second.text, 'その他1', 'その他2']);
  });

  it('提出先を外しても、まだ選んでいる提出先の事項は残す', () => {
    let state = togglePreset({}, [], 'bank');
    expect(state.selection['bank-statements'].checked).toBe(true);
    state = togglePreset(state.selection, state.activePresetIds, 'koseki');
    state = togglePreset(state.selection, state.activePresetIds, 'bank');
    expect(state.activePresetIds).toEqual(['koseki']);
    expect(state.selection['bank-statements'].checked).toBe(false);
    expect(state.selection['deceased-koseki'].checked).toBe(true);
  });
});

describe('parseStaffPersonal', () => {
  it('生年月日を和暦に、無ければ空', () => {
    expect(parseStaffPersonal({ id: 1, postalCode: '000-0000', address: ' 架空市 ', birthDate: '1990-06-07' })).toEqual({
      address: '架空市',
      birthDate: '平成2年6月7日',
    });
    expect(parseStaffPersonal({ id: 1, address: '', birthDate: null })).toEqual({ address: '', birthDate: '' });
    expect(parseStaffPersonal(null)).toBeNull();
  });
});
