// 口座の同一性を DB まで通して確かめる（UNIQUE 制約と引き継ぎの規則）。値はすべて架空。

import { describe, expect, it } from 'vitest';
import { accountLabel } from '../lib/accountIdentity.js';
import type { AccountFields, TransactionInput } from '../services/transactions.js';
import { bulkReplaceField, createTransaction, getOrCreateAccount, updateTransaction } from '../services/transactions.js';
import { useTestDb } from './helpers/testDb.js';

const db = useTestDb();

const newCase = async (name = 'ZZQ架空商会') => (await db().case.create({ data: { name } })).id;
const accountsOf = (caseId: bigint) => db().account.findMany({ where: { caseId }, orderBy: { id: 'asc' } });
const addTx = (caseId: bigint, account: TransactionInput, over: TransactionInput = {}) =>
  createTransaction(db(), caseId, { date: '2025-04-01', description: 'ZZQ架空', amountOut: 100, ...account, ...over });

const KUKU: AccountFields = { bankName: '架空銀行', branchName: '本店', accountNumber: '1111111' };
const BETSU: AccountFields = { bankName: '別銀行', branchName: '本店', accountNumber: '1111111' };

describe('番号が同じでも銀行・支店が違えば別の口座', () => {
  it('取引を足すと口座は2件になる', async () => {
    const caseId = await newCase();
    expect((await addTx(caseId, KUKU)).ok).toBe(true);
    expect((await addTx(caseId, BETSU, { amountOut: 0, amountIn: 100 })).ok).toBe(true);
    const rows = await accountsOf(caseId);
    expect(rows.map(accountLabel)).toEqual(['架空銀行 本店 1111111', '別銀行 本店 1111111']);
    for (const a of rows) expect(await db().transaction.count({ where: { accountId: a.id } })).toBe(1);
  });

  it('支店名だけが違っても別の口座', async () => {
    const caseId = await newCase();
    await getOrCreateAccount(db(), caseId, KUKU);
    await getOrCreateAccount(db(), caseId, { ...KUKU, branchName: '架空支店' });
    expect(await accountsOf(caseId)).toHaveLength(2);
  });
});

describe('空いている欄の引き継ぎ', () => {
  it('番号だけの口座に後から銀行名が付いても1件のまま', async () => {
    const caseId = await newCase();
    const bare = await getOrCreateAccount(db(), caseId, { accountNumber: '1111111' });
    expect(bare.bankName).toBe('');
    const filled = await getOrCreateAccount(db(), caseId, KUKU);
    expect(filled.id).toBe(bare.id);
    expect(accountLabel(filled)).toBe('架空銀行 本店 1111111');
    expect(await accountsOf(caseId)).toHaveLength(1);
  });

  it('候補が2件あるときは混ぜず、同一性の一致で選ぶ', async () => {
    const caseId = await newCase();
    const kuku = await getOrCreateAccount(db(), caseId, KUKU);
    const betsu = await getOrCreateAccount(db(), caseId, BETSU);
    // 番号だけではどちらとも決められないので、番号だけの口座が新しくできる
    const bare = await getOrCreateAccount(db(), caseId, { accountNumber: '1111111' });
    expect([kuku.id, betsu.id]).not.toContain(bare.id);
    expect(await accountsOf(caseId)).toHaveLength(3);
    // 銀行名まで渡せば元の口座に戻る
    expect((await getOrCreateAccount(db(), caseId, BETSU)).id).toBe(betsu.id);
  });

  it('復元（exact）は空欄の口座を引き継がない', async () => {
    const caseId = await newCase();
    const bare = await getOrCreateAccount(db(), caseId, { accountNumber: '1111111' });
    const exact = await getOrCreateAccount(db(), caseId, KUKU, 'exact');
    expect(exact.id).not.toBe(bare.id);
    expect(await accountsOf(caseId)).toHaveLength(2);
  });
});

describe('口座の欄の書き換え', () => {
  it('書き換えた先が別の口座と同じになるなら 409（まとめない）', async () => {
    const caseId = await newCase();
    const first = await addTx(caseId, KUKU);
    await addTx(caseId, BETSU);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const res = await updateTransaction(db(), caseId, BigInt(first.transaction.id), { bankName: '別銀行' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.status).toBe(409);
    expect(res.error).toContain('別銀行 本店 1111111');
    expect(await accountsOf(caseId)).toHaveLength(2);
  });

  it('一括置換で銀行名をそろえると、同じ同一性になった口座はまとまる', async () => {
    const caseId = await newCase();
    await addTx(caseId, KUKU);
    await addTx(caseId, BETSU);
    expect(await bulkReplaceField(db(), caseId, 'bankName', '別銀行', '架空銀行')).toBe(1);
    const rows = await accountsOf(caseId);
    expect(rows).toHaveLength(1);
    expect(await db().transaction.count({ where: { accountId: rows[0]!.id } })).toBe(2);
  });

  it('一括置換で衝突しなければ書き換えるだけ', async () => {
    const caseId = await newCase();
    await addTx(caseId, KUKU);
    expect(await bulkReplaceField(db(), caseId, 'bankName', '架空銀行', 'ZZQ新銀行')).toBe(1);
    expect((await accountsOf(caseId)).map(accountLabel)).toEqual(['ZZQ新銀行 本店 1111111']);
  });
});
