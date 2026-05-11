import { UserIcon, FileTextIcon, ShieldIcon, WalletIcon, PiggyBankIcon, PlusIcon, TrashIcon } from '@/components/ui/Icons';
import ActionButtons from '@/components/ui/ActionButtons';
import { POLICY_TYPES, PAYMENT_FREQUENCIES, TAX_DEDUCTION_TYPES, GENDER_OPTIONS } from '@/types';
import type { Gender, PaymentFrequency, TaxDeductionType, CashValueMilestone } from '@/types';
import { formatInputValue } from '@/lib/utils';

const INPUT_BASE = "w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500";

type PolicyInputTabProps = {
    clientName: string; setClientName: (v: string) => void;
    birthDate: string; setBirthDate: (v: string) => void;
    gender: Gender; setGender: (v: Gender) => void;
    companyName: string; setCompanyName: (v: string) => void;
    policyType: string; setPolicyType: (v: string) => void;
    policyNumber: string; setPolicyNumber: (v: string) => void;
    contractDate: string; setContractDate: (v: string) => void;
    issueAge: number;
    deathBenefitDisease: string; setDeathBenefitDisease: (v: string) => void;
    deathBenefitAccident: string; setDeathBenefitAccident: (v: string) => void;
    hospDayDisease: string; setHospDayDisease: (v: string) => void;
    hospDayAccident: string; setHospDayAccident: (v: string) => void;
    diagnosisBenefit: string; setDiagnosisBenefit: (v: string) => void;
    policyEndAge: string; setPolicyEndAge: (v: string) => void;
    isWholeLife: boolean; setIsWholeLife: (v: boolean) => void;
    paymentFrequency: PaymentFrequency; setPaymentFrequency: (v: PaymentFrequency) => void;
    premiumAmount: string; setPremiumAmount: (v: string) => void;
    annualPremium: string;
    paymentEndAge: string; setPaymentEndAge: (v: string) => void;
    taxDeductionType: TaxDeductionType; setTaxDeductionType: (v: TaxDeductionType) => void;
    cashValueCurrent: string; setCashValueCurrent: (v: string) => void;
    milestones: CashValueMilestone[];
    addMilestone: () => void;
    removeMilestone: (i: number) => void;
    updateMilestone: (i: number, field: keyof CashValueMilestone, value: number) => void;
    maturityBenefit: string; setMaturityBenefit: (v: string) => void;
    canCalculate: boolean;
    onCalculate: () => void;
    onClear: () => void;
    loadMockData: () => void;
    hasResult: boolean;
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200">
        <span className="text-green-700">{icon}</span>
        <h3 className="text-sm font-bold text-green-800 m-0">{title}</h3>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        {children}
    </div>
);

const PolicyInputTab = (props: PolicyInputTabProps) => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* 顧客基本情報 */}
            <section className="bg-white border border-gray-200 rounded-lg p-4">
                <SectionHeader icon={<UserIcon />} title="顧客基本情報" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="氏名">
                        <input type="text" value={props.clientName} onChange={e => props.setClientName(e.target.value)} placeholder="例: 山田 太郎" className={INPUT_BASE} />
                    </Field>
                    <Field label="生年月日">
                        <input type="date" value={props.birthDate} onChange={e => props.setBirthDate(e.target.value)} className={INPUT_BASE} />
                    </Field>
                    <Field label="性別">
                        <div className="flex gap-4 pt-1">
                            {GENDER_OPTIONS.map(g => (
                                <label key={g.value} className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="radio" name="gender" value={g.value} checked={props.gender === g.value} onChange={() => props.setGender(g.value)} className="accent-green-700" />
                                    <span className="text-sm">{g.label}</span>
                                </label>
                            ))}
                        </div>
                    </Field>
                </div>
            </section>

            {/* 契約基本データ */}
            <section className="bg-white border border-gray-200 rounded-lg p-4">
                <SectionHeader icon={<FileTextIcon />} title="契約基本データ" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="保険会社名">
                        <input type="text" value={props.companyName} onChange={e => props.setCompanyName(e.target.value)} placeholder="例: 〇〇生命保険" className={INPUT_BASE} />
                    </Field>
                    <Field label="保険種類">
                        <select value={props.policyType} onChange={e => props.setPolicyType(e.target.value)} className={INPUT_BASE}>
                            {POLICY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </Field>
                    <Field label="証券番号">
                        <input type="text" value={props.policyNumber} onChange={e => props.setPolicyNumber(e.target.value)} placeholder="例: A-12345678" className={INPUT_BASE} />
                    </Field>
                    <Field label="契約日">
                        <input type="date" value={props.contractDate} onChange={e => props.setContractDate(e.target.value)} className={INPUT_BASE} />
                    </Field>
                    <Field label="契約年齢">
                        <input type="text" value={props.issueAge > 0 ? `${props.issueAge}歳` : ''} readOnly className={`${INPUT_BASE} bg-gray-50 text-gray-500`} />
                    </Field>
                </div>
            </section>

            {/* 保障内容 */}
            <section className="bg-white border border-gray-200 rounded-lg p-4">
                <SectionHeader icon={<ShieldIcon />} title="保障内容" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="死亡保険金（疾病）">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.deathBenefitDisease} onChange={e => props.setDeathBenefitDisease(e.target.value)} placeholder="30,000,000" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="災害死亡保険金">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.deathBenefitAccident} onChange={e => props.setDeathBenefitAccident(e.target.value)} placeholder="60,000,000" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="入院給付金日額（疾病）">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.hospDayDisease} onChange={e => props.setHospDayDisease(e.target.value)} placeholder="10,000" className={`${INPUT_BASE} pr-16 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円/日</span>
                        </div>
                    </Field>
                    <Field label="入院給付金日額（災害）">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.hospDayAccident} onChange={e => props.setHospDayAccident(e.target.value)} placeholder="15,000" className={`${INPUT_BASE} pr-16 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円/日</span>
                        </div>
                    </Field>
                    <Field label="診断一時金（がん等）">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.diagnosisBenefit} onChange={e => props.setDiagnosisBenefit(e.target.value)} placeholder="2,000,000" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="保険期間">
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                                <input type="checkbox" checked={props.isWholeLife} onChange={e => props.setIsWholeLife(e.target.checked)} className="accent-green-700" />
                                <span className="text-sm">終身</span>
                            </label>
                            {!props.isWholeLife && (
                                <div className="relative flex-1">
                                    <input type="number" min="1" max="120" value={props.policyEndAge} onChange={e => props.setPolicyEndAge(e.target.value)} placeholder="70" className={`${INPUT_BASE} pr-8`} />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">歳</span>
                                </div>
                            )}
                        </div>
                    </Field>
                </div>
            </section>

            {/* コスト・収支 */}
            <section className="bg-white border border-gray-200 rounded-lg p-4">
                <SectionHeader icon={<WalletIcon />} title="コスト・収支データ" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="払方">
                        <div className="flex flex-wrap gap-1.5">
                            {PAYMENT_FREQUENCIES.map(f => (
                                <button key={f.value} type="button" onClick={() => props.setPaymentFrequency(f.value)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium border cursor-pointer transition-colors ${
                                        props.paymentFrequency === f.value
                                            ? 'bg-green-700 text-white border-green-700'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >{f.label}</button>
                            ))}
                        </div>
                    </Field>
                    <Field label="保険料（1回あたり）">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.premiumAmount} onChange={e => props.setPremiumAmount(e.target.value)} placeholder="25,000" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="年間保険料">
                        <div className="relative">
                            <input type="text" value={props.annualPremium} readOnly className={`${INPUT_BASE} bg-gray-50 text-gray-500 font-mono-num pr-8`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="払込期間">
                        <div className="relative">
                            <input type="number" min="1" max="120" value={props.paymentEndAge} onChange={e => props.setPaymentEndAge(e.target.value)} placeholder="60" className={`${INPUT_BASE} pr-8`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">歳まで</span>
                        </div>
                    </Field>
                    <Field label="控除区分">
                        <div className="flex flex-wrap gap-1.5">
                            {TAX_DEDUCTION_TYPES.map(t => (
                                <button key={t.value} type="button" onClick={() => props.setTaxDeductionType(t.value)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium border cursor-pointer transition-colors ${
                                        props.taxDeductionType === t.value
                                            ? 'bg-green-700 text-white border-green-700'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >{t.label}</button>
                            ))}
                        </div>
                    </Field>
                </div>
            </section>

            {/* 貯蓄性・資産価値 */}
            <section className="bg-white border border-gray-200 rounded-lg p-4">
                <SectionHeader icon={<PiggyBankIcon />} title="貯蓄性・資産価値データ" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Field label="現在の解約返戻金">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.cashValueCurrent} onChange={e => props.setCashValueCurrent(e.target.value)} placeholder="450,000" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                    <Field label="満期保険金">
                        <div className="relative">
                            <input type="text" inputMode="numeric" value={props.maturityBenefit} onChange={e => props.setMaturityBenefit(e.target.value)} placeholder="0" className={`${INPUT_BASE} pr-8 font-mono-num`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                        </div>
                    </Field>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-600">解約返戻金の推移（将来予測）</label>
                        <button type="button" onClick={props.addMilestone} className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 border border-green-300 rounded hover:bg-green-50 cursor-pointer transition-colors">
                            <PlusIcon size={14} /> 行追加
                        </button>
                    </div>
                    {props.milestones.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-green-800 text-white">
                                        <th className="py-1.5 px-3 text-left font-medium">年齢</th>
                                        <th className="py-1.5 px-3 text-left font-medium">解約返戻金</th>
                                        <th className="py-1.5 px-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {props.milestones.map((m, i) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="py-1.5 px-3">
                                                <div className="relative">
                                                    <input type="number" min="0" max="120" value={m.age} onChange={e => props.updateMilestone(i, 'age', parseInt(e.target.value) || 0)} className="w-20 p-1 border border-gray-300 rounded text-sm pr-6" />
                                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">歳</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3">
                                                <div className="relative">
                                                    <input type="text" inputMode="numeric" value={formatInputValue(m.value)} onChange={e => props.updateMilestone(i, 'value', parseInt(e.target.value.replace(/,/g, '')) || 0)} className="w-full p-1 border border-gray-300 rounded text-sm font-mono-num pr-6" />
                                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">円</span>
                                                </div>
                                            </td>
                                            <td className="py-1.5 px-3 text-center">
                                                <button type="button" onClick={() => props.removeMilestone(i)} className="p-1 text-red-400 hover:text-red-600 cursor-pointer" title="削除">
                                                    <TrashIcon size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {props.milestones.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">「行追加」で将来の解約返戻金予測値を入力してください</p>
                    )}
                </div>
            </section>

            <ActionButtons
                canCalculate={props.canCalculate}
                hasResult={props.hasResult}
                onCalculate={props.onCalculate}
                onClear={props.onClear}
                onLoadMock={props.loadMockData}
            />
        </div>
    );
};

export default PolicyInputTab;
