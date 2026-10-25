import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookUser, Database, Home, Moon, Plus, Printer, Sun, Trash2, UserRound } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { usePowerOfAttorneyForm, type DirectoryMessage, type PrincipalForm } from '@/hooks/usePowerOfAttorneyForm';
import { CompanyField } from '@/components/ui/CompanyField';
import { BIRTH_PLACEHOLDER, KIND_OPTIONS, RadioGroup, Section, TextField, inputClass } from '@/components/powerOfAttorney/FormFields';
import { PrincipalPickerDialog } from '@/components/powerOfAttorney/PrincipalPickerDialog';
import { POA_PAGE_STYLE, PowerOfAttorneySheetView } from '@/components/powerOfAttorney/PowerOfAttorneySheetView';
import '@/components/powerOfAttorney/powerOfAttorney.css';
import { StaffPickerDialog } from '@/shared/staff-directory/StaffPickerDialog';
import { MATTER_PRESETS, editedText, splitExtraMatters, type Purpose } from '@/utils/powerOfAttorney/matters';
import type { DocumentKind, NameMode } from '@/utils/powerOfAttorney/record';
import { slotDiffersFromRecord } from '@/utils/powerOfAttorney/principalLink';
import { exportFileName } from '@/utils/exportFileName';

const COMPANY_DIRECTORY_URL = '/staff-directory/companies';

// 定型文は全社共通なので、押す前に確かめる
const REGISTER_CONFIRM = '定型文は全社共通です。この文面を委任事項マスタに登録しますか？\n（マスタ管理の「委任事項」タブで直し・削除ができます）';

const PURPOSE_OPTIONS: { value: Purpose; label: string }[] = [
  { value: 'inheritance', label: '相続手続き' },
  { value: 'personal', label: '委任者本人の手続き' },
];
const DOCUMENT_OPTIONS: { value: DocumentKind; label: string }[] = [
  { value: 'both', label: '委任状＋復代理委任状' },
  { value: 'principal', label: '委任状だけ' },
  { value: 'subdelegate', label: '復代理委任状だけ' },
];
const NAME_MODE_OPTIONS: { value: NameMode; label: string }[] = [
  { value: 'printed', label: '印字する' },
  { value: 'signature', label: '空欄（自署）' },
];
const PRINT_OPTIONS: { value: 'print' | 'blank'; label: string }[] = [
  { value: 'print', label: '印字する' },
  { value: 'blank', label: '空欄（手書き）' },
];

const linkButtonClass =
  'flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline';

/**
 * 委任状・復代理委任状を作る画面。入力は保存しない（印刷して PDF にしたら閉じる前提）。
 * 委任者は委任者DBから呼び出せ、「委任者DBに登録」を押したときだけ残る（`?principal=` で1人目に入る）。
 * 受任者は見出しの「会社」、復代理人は社員台帳から選ぶ。
 */
export const PowerOfAttorneyPage = () => {
  const { isDark, toggleDark } = useDarkMode();
  const [searchParams] = useSearchParams();
  const linkedId = Number(searchParams.get('principal'));
  const form = usePowerOfAttorneyForm(Number.isInteger(linkedId) && linkedId > 0 ? linkedId : undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 委任者DBから選んだ人を入れる先（欄の id か、欄を足す 'new'）
  const [principalPickerTarget, setPrincipalPickerTarget] = useState<number | 'new' | null>(null);
  const [editingMatter, setEditingMatter] = useState<string | null>(null);
  const errorCount = Object.keys(form.birthErrors).length;
  const { company } = form;

  const handlePrint = () => {
    // PDF に保存するときの既定のファイル名は document.title から付く
    const previous = document.title;
    const subject = form.purpose === 'inheritance' ? form.deceased.name : form.principals[0]?.name ?? '';
    document.title = exportFileName([subject, '委任状'], 'pdf').replace(/\.pdf$/, '');
    window.print();
    document.title = previous;
  };

  return (
    <div className="poa-root w-full">
      <style>{POA_PAGE_STYLE}</style>
      <div className="no-print sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a href="/" className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400" title="ポータルに戻る">
              <Home className="h-5 w-5" />
              <span className="hidden md:inline text-sm font-medium">ポータル</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <Link to="/" className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400" title="書類リストに戻る">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">書類リスト</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">委任状</h1>
            {/* 受任者（＝この会社）を切り替える */}
            <CompanyField />
            <Link
              to="/power-of-attorney/principals"
              className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              <BookUser className="h-4 w-4" /> 委任者DB
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={errorCount > 0 || form.matters.length === 0}
              title={
                errorCount > 0
                  ? '生年月日の誤りを直してください'
                  : form.matters.length === 0
                    ? '委任事項を選んでください'
                    : '印刷（PDF に保存する場合は送信先で「PDF に保存」）'
              }
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Printer className="w-4 h-4" /> 印刷・PDF
            </button>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 md:px-8 md:py-6 flex flex-col xl:flex-row gap-6 items-start print:block print:p-0">
        <div className="no-print w-full xl:w-[440px] xl:shrink-0 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ここで入力した内容は保存されません（画面を閉じると消えます）。また使う委任者は「委任者DBに登録」で残せます。印刷の送信先で「PDF に保存」を選べば PDF になります。
          </p>

          <Section title="作る書類">
            <RadioGroup label="用途" name="purpose" options={PURPOSE_OPTIONS} value={form.purpose} onChange={form.setPurpose} />
            <RadioGroup label="書類" name="documents" options={DOCUMENT_OPTIONS} value={form.documents} onChange={form.setDocuments} />
            <RadioGroup
              label="委任者の住所・生年月日"
              name="details"
              options={PRINT_OPTIONS}
              value={form.printDetails ? 'print' : 'blank'}
              onChange={(v) => form.setPrintDetails(v === 'print')}
            />
            <RadioGroup label="委任者の氏名（個人）" name="name-mode" options={NAME_MODE_OPTIONS} value={form.nameMode} onChange={form.setNameMode} />
            {form.documents === 'subdelegate' && (
              <p className="text-xs text-slate-500 dark:text-slate-400">復代理委任状だけのときは、個人の氏名は空欄（自署）で刷ります。</p>
            )}
            <RadioGroup
              label="日付"
              name="date"
              options={[
                { value: 'print', label: '今日の日付' },
                { value: 'blank', label: '空欄（手書き）' },
              ]}
              value={form.printDate ? 'print' : 'blank'}
              onChange={(v) => form.setPrintDate(v === 'print')}
            />
          </Section>

          {form.purpose === 'inheritance' && (
            <Section title="被相続人">
              <TextField label="氏名" value={form.deceased.name} onChange={(name) => form.setDeceased({ ...form.deceased, name })} />
              <TextField
                label="生年月日"
                value={form.deceased.birthInput}
                placeholder={BIRTH_PLACEHOLDER}
                error={form.birthErrors.deceased}
                onChange={(birthInput) => form.setDeceased({ ...form.deceased, birthInput })}
              />
            </Section>
          )}

          <Section title="委任者" note="1人につき1組（委任状と復代理委任状）を刷ります。">
            {form.principals.map((principal, index) => (
              <div key={principal.id} className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{index + 1}人目</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPrincipalPickerTarget(principal.id)} className={linkButtonClass}>
                      <Database className="w-3.5 h-3.5" /> DBから選ぶ
                    </button>
                    {form.principals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => form.removePrincipal(principal.id)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 外す
                      </button>
                    )}
                  </div>
                </div>
                <RadioGroup
                  label="区分"
                  name={`kind-${principal.id}`}
                  options={KIND_OPTIONS}
                  value={principal.kind}
                  onChange={(kind) => form.updatePrincipal(principal.id, { kind })}
                />
                <TextField label="住所" value={principal.address} onChange={(address) => form.updatePrincipal(principal.id, { address })} />
                <TextField
                  label={principal.kind === 'corporate' ? '法人名' : '氏名'}
                  value={principal.name}
                  onChange={(name) => form.updatePrincipal(principal.id, { name })}
                />
                {principal.kind === 'corporate' ? (
                  <TextField
                    label="代表者（役職と氏名）"
                    value={principal.representative}
                    placeholder="代表取締役 山田太郎"
                    onChange={(representative) => form.updatePrincipal(principal.id, { representative })}
                  />
                ) : (
                  <TextField
                    label="生年月日"
                    value={principal.birthInput}
                    placeholder={BIRTH_PLACEHOLDER}
                    error={form.birthErrors[`principal-${principal.id}`]}
                    onChange={(birthInput) => form.updatePrincipal(principal.id, { birthInput })}
                  />
                )}
                <PrincipalDirectoryRow
                  principal={principal}
                  saving={form.savingSlotId === principal.id}
                  busy={form.savingSlotId !== null}
                  hasBirthError={Boolean(form.birthErrors[`principal-${principal.id}`])}
                  message={form.directoryMessage?.slotId === principal.id ? form.directoryMessage : null}
                  onSave={() => void form.saveToDirectory(principal.id)}
                  onUnlink={() => form.unlinkRecord(principal.id)}
                />
              </div>
            ))}
            {form.directoryMessage?.slotId === null && (
              <p role="status" className="text-xs text-red-600 dark:text-red-400">{form.directoryMessage.text}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={form.addPrincipal}
                className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <Plus className="w-4 h-4" /> 委任者を足す
              </button>
              <button
                type="button"
                onClick={() => setPrincipalPickerTarget('new')}
                className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <Database className="w-4 h-4" /> DBから選んで足す
              </button>
            </div>
          </Section>

          <Section
            title="委任事項"
            note={form.purpose === 'inheritance' ? '提出先を選ぶと、そこで要る事項に印が付きます（後から1つずつ付け外しできます）。' : undefined}
          >
            {form.masterStatus === 'fallback' && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                委任事項マスタを読み込めなかったため、初期の文面を出しています（定型文への登録はできません）。
              </p>
            )}
            {form.purpose === 'inheritance' && (
              <div className="flex flex-wrap gap-2">
                {MATTER_PRESETS.map((preset) => {
                  const active = form.activePresetIds.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => form.togglePresetById(preset.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        active
                          ? 'bg-emerald-700 border-emerald-700 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
            <ul className="space-y-2">
              {form.availableMatters.map((matter) => {
                const state = form.selection[matter.id];
                const editing = editingMatter === matter.id;
                const edited = Boolean(state?.text.trim());
                const registrable = form.masterStatus === 'ok' && Boolean(editedText(matter, form.selection));
                return (
                  <li key={matter.id} className="text-sm">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state?.checked ?? false}
                        onChange={(e) => form.updateMatter(matter.id, { checked: e.target.checked })}
                        className="mt-1 accent-emerald-600"
                      />
                      <span className={state?.checked ? '' : 'text-slate-500 dark:text-slate-400'}>
                        {state?.text.trim() || matter.text}
                        {edited && <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">（直した文面）</span>}
                      </span>
                    </label>
                    <div className="ml-6 mt-1 flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditingMatter(editing ? null : matter.id)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        {editing ? '閉じる' : '文面を直す'}
                      </button>
                      {edited && (
                        <button
                          type="button"
                          onClick={() => form.updateMatter(matter.id, { text: '' })}
                          className="text-slate-500 hover:underline"
                        >
                          ひな形に戻す
                        </button>
                      )}
                      {registrable && (
                        <button
                          type="button"
                          disabled={form.registering}
                          onClick={() => {
                            if (window.confirm(REGISTER_CONFIRM)) void form.registerEditedMatter(matter.id);
                          }}
                          className="text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
                        >
                          この文面を定型文に登録
                        </button>
                      )}
                    </div>
                    {editing && (
                      <textarea
                        className={`${inputClass} ml-6 mt-1 w-[calc(100%-1.5rem)]`}
                        rows={3}
                        value={state?.text || matter.text}
                        onChange={(e) =>
                          form.updateMatter(matter.id, { text: e.target.value === matter.text ? '' : e.target.value })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">その他の委任事項（1行に1つ）</span>
              <textarea
                className={inputClass}
                rows={3}
                value={form.extraMatters}
                onChange={(e) => form.setExtraMatters(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {form.masterStatus === 'ok' && splitExtraMatters(form.extraMatters).length > 0 && (
                <button
                  type="button"
                  disabled={form.registering}
                  onClick={() => {
                    if (window.confirm(REGISTER_CONFIRM)) void form.registerExtraMatters();
                  }}
                  className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
                >
                  この文面を定型文に登録
                </button>
              )}
              <Link to="/masters?tab=poa-matters" className="text-slate-500 hover:underline">
                定型文の並び替え・削除はマスタ管理で
              </Link>
            </div>
            {form.registerMessage && (
              <p
                role="status"
                className={`text-xs ${form.registerMessage.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {form.registerMessage.text}
              </p>
            )}
            {form.matters.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">委任事項が1つも選ばれていません。</p>
            )}
          </Section>

          <Section title="受任者（見出しの「会社」）">
            <dl className="text-sm grid grid-cols-[5rem_1fr] gap-y-1">
              <dt className="text-slate-500">法人名</dt>
              <dd>{company.name}</dd>
              <dt className="text-slate-500">所在地</dt>
              <dd>{company.address || <span className="text-slate-400">未登録</span>}</dd>
              <dt className="text-slate-500">代表者</dt>
              <dd>{company.representative || <span className="text-amber-700 dark:text-amber-400">未登録</span>}</dd>
            </dl>
            {!company.representative && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                代表者は社員台帳の会社一覧で登録します（
                <a href={COMPANY_DIRECTORY_URL} target="_blank" rel="noopener" className="underline">
                  会社一覧を開く
                </a>
                ）。登録したらこの画面を開き直してください。
              </p>
            )}
          </Section>

          {form.documents !== 'principal' && (
            <Section title="復代理人（社員台帳から）">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <UserRound className="w-4 h-4" />
                {form.subAgent ? form.subAgent.name : '社員を選ぶ'}
              </button>
              {form.subAgent && (
                <>
                  {form.subAgent.status === 'loading' && <p className="text-xs text-slate-500">住所・生年月日を読み込み中…</p>}
                  {form.subAgent.status === 'missing' && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">台帳から住所・生年月日を読めませんでした。必要なら手で入れてください。</p>
                  )}
                  <TextField label="住所" value={form.subAgent.address} onChange={(address) => form.updateSubAgent({ address })} />
                  <TextField
                    label="生年月日"
                    value={form.subAgent.birthInput}
                    placeholder={BIRTH_PLACEHOLDER}
                    error={form.birthErrors.subAgent}
                    onChange={(birthInput) => form.updateSubAgent({ birthInput })}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">ここで直しても社員台帳は変わりません。</p>
                </>
              )}
            </Section>
          )}
        </div>

        {/* 印刷ではスクロール領域にしない（overflow があると2枚目以降が切れる） */}
        <div className="w-full min-w-0 overflow-x-auto print:overflow-visible">
          <div className="space-y-6 print:space-y-0">
            {form.sheets.map((sheet) => (
              <div key={sheet.key} className="poa-page space-y-1">
                <p className="no-print text-xs font-medium text-slate-500 dark:text-slate-400">{sheet.label}</p>
                <div className="shadow-lg print:shadow-none w-fit">
                  <PowerOfAttorneySheetView sheet={sheet} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {principalPickerTarget !== null && (
        <PrincipalPickerDialog
          title={principalPickerTarget === 'new' ? '委任者DBから選んで足す' : '委任者DBから選ぶ'}
          onClose={() => setPrincipalPickerTarget(null)}
          onPick={(record) => {
            form.applyRecord(principalPickerTarget, record);
            setPrincipalPickerTarget(null);
          }}
        />
      )}

      <StaffPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="復代理人を選ぶ"
        currentId={form.subAgent?.staffId ?? null}
        onPick={(person) => {
          void form.pickSubAgent(person);
          setPickerOpen(false);
        }}
        clearLabel="復代理人を外す"
        quickSections
        fallbackMessage="社員台帳に接続できないため、復代理人を選べません。"
        searchLabel="名前・よみ・部署で探す"
        summary={<p className="text-sm text-slate-600">復代理委任状の【復代理人】欄に刷る社員を選びます。</p>}
      />
    </div>
  );
};

/** 委任者の欄の下：委任者DBとのつながりと、登録・更新のボタン */
const PrincipalDirectoryRow = ({
  principal,
  saving,
  busy,
  hasBirthError,
  message,
  onSave,
  onUnlink,
}: {
  principal: PrincipalForm;
  saving: boolean;
  busy: boolean;
  hasBirthError: boolean;
  message: DirectoryMessage | null;
  onSave: () => void;
  onUnlink: () => void;
}) => {
  const { record } = principal;
  const differs = record ? slotDiffersFromRecord(principal, record) : false;
  const nameMissing = !principal.name.trim();
  return (
    <div className="pt-1 space-y-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {record && (
          <span className="text-slate-500 dark:text-slate-400">
            委任者DB: {record.name}
            {differs && <span className="ml-1 text-amber-700 dark:text-amber-400">（この画面で直しています）</span>}
            <button type="button" onClick={onUnlink} className="ml-2 underline hover:text-slate-700 dark:hover:text-slate-200">
              つながりを外す
            </button>
          </span>
        )}
        {(!record || differs) && (
          <button
            type="button"
            onClick={onSave}
            disabled={nameMissing || hasBirthError || busy}
            title={nameMissing ? '氏名を入れると登録できます' : hasBirthError ? '生年月日の誤りを直してください' : undefined}
            className={linkButtonClass}
          >
            <Database className="w-3.5 h-3.5" />
            {saving ? '保存中…' : record ? 'DBの登録内容を更新' : '委任者DBに登録'}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className={`text-xs ${message.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
};
