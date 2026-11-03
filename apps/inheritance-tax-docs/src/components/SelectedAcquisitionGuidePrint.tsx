import {
  BookOpenCheck,
  Building2,
  CircleAlert,
  CreditCard,
  FileCheck2,
  Landmark,
  MapPin,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import {
  ACQUISITION_GUIDES,
  formatAcquisitionGuideRequest,
  type AcquisitionGuideDefinition,
  type AcquisitionGuideId,
  type AcquisitionGuideVisual,
} from '@/constants/acquisitionGuides';
import { getFullAddress, useCompanyInfo } from '@/shared/staff-directory/company';
import { getPhoneLine } from '@/utils/companyContact';
import { RetryImage } from '@/components/ui/RetryImage';

type SelectedAcquisitionGuidePrintProps = {
  selectedIds: AcquisitionGuideId[];
  currentDate: string;
  clientName: string;
  deceasedName: string;
  personInCharge: string;
  personInChargeContact: string;
  imageUrls: Partial<Record<AcquisitionGuideId, string>>;
};
const VISUAL_ICONS: Record<AcquisitionGuideVisual, LucideIcon> = {
  registry: BookOpenCheck,
  certificate: Building2,
  bank: WalletCards,
  insurance: ShieldCheck,
  'family-tree': Landmark,
};

const GuideSample = ({ guide, imageUrl }: { guide: AcquisitionGuideDefinition; imageUrl?: string }) => {
  const Icon = VISUAL_ICONS[guide.visual];
  const placeholder = (
    <div className="guide-selection-sample-placeholder" role="img" aria-label={`${guide.sampleTitle}の簡易図解`}>
      <Icon className="h-12 w-12 text-emerald-700" aria-hidden="true" />
      <p className="mt-4 text-xs font-bold tracking-widest text-emerald-700">書類の見分け方</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{guide.sampleTitle}</p>
      <div className="mt-5 w-full space-y-2">
        <div className="h-2 w-3/4 rounded bg-slate-300" />
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-12 rounded border border-slate-300" />
          <div className="h-12 rounded border border-slate-300" />
          <div className="h-12 rounded border border-slate-300" />
        </div>
      </div>
      <p className="mt-5 text-[10px] leading-relaxed text-slate-500">実際の様式は発行元によって異なります。</p>
    </div>
  );
  if (!imageUrl) return placeholder;
  return <RetryImage src={imageUrl} alt={`${guide.sampleTitle}の見本`} className="guide-selection-sample-image" fallback={placeholder} />;
};

const GuideCautions = ({ cautions }: { cautions: string[] }) => (
  <div className="guide-selection-caution-box mt-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
    <ul className="space-y-1">{cautions.map((item) => <li key={item}>・{item}</li>)}</ul>
  </div>
);

export const SelectedAcquisitionGuidePrint = ({
  selectedIds,
  currentDate,
  clientName,
  deceasedName,
  personInCharge,
  personInChargeContact,
  imageUrls,
}: SelectedAcquisitionGuidePrintProps) => {
  const { company } = useCompanyInfo();
  const selectedSet = new Set(selectedIds);
  const guides = ACQUISITION_GUIDES.filter((guide) => selectedSet.has(guide.id));

  return (
    <main className="hidden print:block guide-selection-print">
      {guides.map((guide) => (
        <section key={guide.id} className="guide-selection-page" data-guide-id={guide.id}>
          <header className="guide-selection-header">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-emerald-700">相続税申告用・資料取得のご案内</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">{guide.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{guide.shortDescription}</p>
            </div>
            <div className="text-right text-[10px] leading-relaxed text-slate-500">
              <p className="font-bold text-slate-800">{company.name}</p>
              <p>{getFullAddress(company)}</p>
              <p>{getPhoneLine(company)}</p>
              {(personInCharge || personInChargeContact) && <p>担当: {personInCharge || '−'}　{personInChargeContact || ''}</p>}
              <p>発行日: {currentDate}</p>
              {clientName && <p>ご依頼者: {clientName} 様</p>}
            </div>
          </header>

          <div className="guide-selection-layout">
            <div className="min-w-0">
              <div className="guide-selection-counter-box">
                <p className="guide-selection-counter-label">窓口・ご担当者の方へ</p>
                <p className="mt-2 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-extrabold leading-relaxed text-red-700">
                  このページをご確認ください。不明な点がありましたら、発行元の{company.name}
                  {personInCharge ? `（担当：${personInCharge}）` : 'の担当者'}へご連絡ください。連絡先は右上に記載しています。
                </p>
                <p className="mt-3 text-base font-bold leading-relaxed text-slate-950">
                  {formatAcquisitionGuideRequest(guide, deceasedName)}
                </p>
                {guide.requestOptions ? (
                  <dl className="mt-3 grid grid-cols-3 gap-2" aria-label="申込書で選ぶ内容">
                    {guide.requestOptions.map((option) => (
                      <div key={option.label} className="rounded-md border border-blue-300 bg-blue-50 px-2 py-2">
                        <dt className="text-[10px] font-bold text-blue-800">{option.label}</dt>
                        <dd className="mt-0.5 text-xs font-extrabold leading-snug text-slate-950">{option.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <div className="mt-3 border-t border-emerald-200 pt-3 text-sm font-bold text-emerald-950">
                  必要な枚数: {guide.requiredCopiesLabel ?? `${guide.requiredCopies}枚`}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="guide-selection-info-box">
                  <h2><MapPin className="h-4 w-4" aria-hidden="true" />どこで取るか</h2>
                  <p>{guide.destination}</p>
                </div>
                <div className="guide-selection-info-box">
                  <h2><UserRoundCheck className="h-4 w-4" aria-hidden="true" />手続きできる方</h2>
                  <p>{guide.requester}</p>
                </div>
              </div>

              <div className="mt-3 guide-selection-info-box">
                <h2><FileCheck2 className="h-4 w-4" aria-hidden="true" />持っていくもの・用意するもの</h2>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {guide.bring.map((item) => <li key={item}>□ {item}</li>)}
                </ul>
              </div>

              <div className="mt-3 guide-selection-info-box">
                <h2><BookOpenCheck className="h-4 w-4" aria-hidden="true" />手続きの流れ</h2>
                <ol className="mt-2 space-y-1.5">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-2"><span className="guide-selection-step-number">{stepIndex + 1}</span><span>{step}</span></li>
                  ))}
                </ol>
              </div>

              {guide.id !== 'bank-balance' ? <GuideCautions cautions={guide.cautions} /> : null}

            </div>

            <aside>
              <GuideSample guide={guide} imageUrl={imageUrls[guide.id]} />
              <div className="mt-3 rounded-lg border border-slate-200 p-3 text-[10px] leading-relaxed text-slate-600">
                <p className="font-bold text-slate-800">お客様へ</p>
                <p className="mt-1">手続きの方法、用意するもの、手数料は、役所や会社によって違います。訪問前に公式サイトまたは電話でご確認ください。</p>
              </div>
              <div className="mt-3 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-950">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
                <div><p className="font-bold">マイナンバーカードでの取得</p><ul className="mt-1 space-y-1">{guide.myNumberCard.map((item) => <li key={item}>・{item}</li>)}</ul></div>
              </div>
              {guide.id === 'bank-balance' ? <GuideCautions cautions={guide.cautions} /> : null}
            </aside>
          </div>

        </section>
      ))}
    </main>
  );
};
