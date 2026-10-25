/**
 * 委任状・復代理委任状の1枚ずつの中身（何をどの欄に刷るか）。画面の部品はこれを並べるだけにする。
 *
 * 文面と欄の決まりは事務所の委任状のひな形どおり:
 * - 法人の委任者は「法人名　代表者」を必ず刷り、生年月日の行を出さず、社印の注記にする
 * - 復代理委任状だけを作るときは個人の氏名を刷らない（本人に自署してもらうため）
 * - 空の欄も行は残す（手書きで埋める欄として刷る）
 */
import type { Purpose } from './matters';

export type DocumentKind = 'both' | 'principal' | 'subdelegate';
export type NameMode = 'printed' | 'signature';

export type PrincipalInput = {
  kind: 'individual' | 'corporate';
  address: string;
  /** 個人は氏名、法人は法人名 */
  name: string;
  /** 法人だけ（役職と氏名） */
  representative: string;
  /** 和暦に直した生年月日（空なら手書き） */
  birthDate: string;
};

export type PowerOfAttorneyInput = {
  purpose: Purpose;
  documents: DocumentKind;
  /** false なら委任者の住所・生年月日を空欄で刷る */
  printDetails: boolean;
  nameMode: NameMode;
  deceased: { name: string; birthDate: string };
  principals: PrincipalInput[];
  /** 刷る委任事項（並べ済み） */
  matters: string[];
  /** 書類の日付（和暦）。空なら手書き */
  date: string;
  agent: { name: string; address: string; representative: string };
  subAgent: { name: string; address: string; birthDate: string } | null;
};

export type SheetRow = { label: string; value: string; seal?: string; sealNote?: string };

export type PowerOfAttorneySheet = {
  /** React の key と画面の見出しに使う（「1人目・委任状」など） */
  key: string;
  label: string;
  title: string;
  /** 上の表（委任状は受任者、復代理委任状は復代理人） */
  upperHeading: string;
  upperRows: SheetRow[];
  /** 表の下の本文（1要素1段落） */
  delegation: string[];
  matterHeading: string;
  matters: string[];
  closingItems: string[];
  date: string;
  principalHeading: string;
  principalRows: SheetRow[];
  /** 復代理委任状の末尾の代理人（＝受任会社）の表 */
  agentRows: SheetRow[] | null;
};

const BLANK_NAME = '　　　　　　　　　';
const BLANK_DATE = '令和　　　年　　　月　　　日';
const BLANK_BIRTH = '　　　年　　　月　　　日';

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join('　');

/** 委任者の氏名欄に刷る名前（空なら手書き） */
function principalName(principal: PrincipalInput, nameMode: NameMode): string {
  if (principal.kind === 'corporate') return join(principal.name, principal.representative);
  return nameMode === 'printed' ? principal.name.trim() : '';
}

function matterHeading(input: PowerOfAttorneyInput): string {
  if (input.purpose === 'personal') return '１．委任者本人の不動産証明の取得に関する下記の権限';
  const name = input.deceased.name.trim() || BLANK_NAME;
  const birth = input.deceased.birthDate.trim() || BLANK_BIRTH;
  return `１．被相続人　${name}（${birth}生）の相続手続きに関する下記の権限`;
}

function principalHeading(input: PowerOfAttorneyInput, principal: PrincipalInput, original: boolean): string {
  const prefix = original ? '本来の委任者' : '委任者';
  if (input.purpose === 'inheritance') return original ? `【${prefix}（相続人）】` : `【${prefix}（相続人及び受遺者）】`;
  return `【${prefix}（${principal.kind === 'corporate' ? '法人' : '本人'}）】`;
}

function principalRows(
  input: PowerOfAttorneyInput,
  principal: PrincipalInput,
  nameMode: NameMode,
  withSeal: boolean,
): SheetRow[] {
  const corporate = principal.kind === 'corporate';
  const seal = withSeal
    ? corporate
      ? { seal: '（社印）', sealNote: '法人名の入った社印を押印してください' }
      : { seal: '（印）', sealNote: '金融機関等提出の場合は実印' }
    : {};
  const rows: SheetRow[] = [
    { label: '住所', value: input.printDetails ? principal.address.trim() : '' },
    { label: '氏名', value: principalName(principal, nameMode), ...seal },
  ];
  // 法人に生年月日は無いので行ごと出さない
  if (!corporate) rows.push({ label: '生年月日', value: input.printDetails ? principal.birthDate.trim() : '' });
  return rows;
}

const agentRows = (input: PowerOfAttorneyInput, seal?: string): SheetRow[] => [
  { label: '所在地', value: input.agent.address.trim() },
  { label: '法人名・代表', value: join(input.agent.name, input.agent.representative), ...(seal ? { seal } : {}) },
];

function principalSheet(input: PowerOfAttorneyInput, principal: PrincipalInput, index: number): PowerOfAttorneySheet {
  return {
    key: `${index}-principal`,
    label: `${index + 1}人目・委任状`,
    title: '委任状（原本還付希望）',
    upperHeading: '【受任者】',
    upperRows: agentRows(input),
    delegation: ['私は、上記の者を代理人と定め、下記事項を委任します。', '尚、復委任も可とします。'],
    matterHeading: matterHeading(input),
    matters: input.matters,
    closingItems: ['２．代理人の復代理人選任に関する一切の権限', '３．本委任状の原本還付請求及び受領に関する一切の権限'],
    date: input.date.trim() || BLANK_DATE,
    principalHeading: principalHeading(input, principal, false),
    principalRows: principalRows(input, principal, input.nameMode, true),
    agentRows: null,
  };
}

function subdelegateSheet(
  input: PowerOfAttorneyInput,
  principal: PrincipalInput,
  index: number,
  nameMode: NameMode,
): PowerOfAttorneySheet {
  const sub = input.subAgent;
  const name = principalName(principal, nameMode) || BLANK_NAME;
  return {
    key: `${index}-subdelegate`,
    label: `${index + 1}人目・復代理委任状`,
    title: '復代理委任状',
    upperHeading: '【復代理人】',
    upperRows: [
      { label: '住所', value: sub?.address.trim() ?? '' },
      { label: '氏名', value: sub?.name.trim() ?? '' },
      { label: '生年月日', value: sub?.birthDate.trim() || BLANK_BIRTH },
    ],
    delegation: [
      `私は、委任者　${name}　より受任した権限に基づき、${input.agent.name.trim()}　の職員である上記の者を復代理人と定め、下記事項を委任します。`,
    ],
    matterHeading: matterHeading(input),
    matters: input.matters,
    closingItems: ['２．本委任状の原本還付請求及び受領に関する一切の権限'],
    date: input.date.trim() || BLANK_DATE,
    principalHeading: principalHeading(input, principal, true),
    principalRows: principalRows(input, principal, nameMode, false),
    agentRows: agentRows(input, '（実印）'),
  };
}

/** 委任者1人につき、委任状 → 復代理委任状 の順で並べる（作らない方は飛ばす） */
export function buildSheets(input: PowerOfAttorneyInput): PowerOfAttorneySheet[] {
  // 復代理委任状だけを渡すときは、本人に自署してもらう
  const subNameMode: NameMode = input.documents === 'subdelegate' ? 'signature' : input.nameMode;
  return input.principals.flatMap((principal, index) => [
    ...(input.documents !== 'subdelegate' ? [principalSheet(input, principal, index)] : []),
    ...(input.documents !== 'principal' ? [subdelegateSheet(input, principal, index, subNameMode)] : []),
  ]);
}
