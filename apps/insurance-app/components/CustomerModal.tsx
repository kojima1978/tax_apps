'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { FamilyMember, Agency, AgencyMaster, ValuationSettings } from '@/types';
import {
  createAgencyMaster,
  fetchAgencyMasters,
  updateAgencyMaster,
} from '@/lib/api';
import { Users, X, Plus, Trash2, Building2, Download, Save, RefreshCw, DollarSign } from 'lucide-react';
import { mergeRelationshipSuggestions } from '@/utils/relationshipOptions';
import AgencyLogoPicker from '@/components/AgencyLogoPicker';

export type CustomerSettingsSection = 'family' | 'valuation' | 'agency';

interface CustomerModalProps {
  section: CustomerSettingsSection;
  familyMembers: FamilyMember[];
  agency: Agency;
  valuationSettings: ValuationSettings;
  hasUsdPolicies: boolean;
  onSave: (updatedFamily: FamilyMember[], updatedAgency: Agency, updatedValuationSettings: ValuationSettings) => Promise<void> | void;
  onClose: () => void;
}

function toKatakana(str: string): string {
  return str.replace(/[ぁ-ゖ]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function sortAgencyMasters(masters: AgencyMaster[]): AgencyMaster[] {
  return [...masters].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  section,
  familyMembers,
  agency,
  valuationSettings,
  hasUsdPolicies,
  onSave,
  onClose,
}) => {
  const [tempMembers, setTempMembers] = useState<FamilyMember[]>(familyMembers);
  const [tempAgency, setTempAgency] = useState<Agency>(agency);
  const [tempValuationSettings, setTempValuationSettings] = useState<ValuationSettings>(valuationSettings);
  const [agencyMasters, setAgencyMasters] = useState<AgencyMaster[]>([]);
  const [selectedAgencyMasterId, setSelectedAgencyMasterId] = useState('');
  const [agencyMasterNotice, setAgencyMasterNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAgencyMasterSaving, setIsAgencyMasterSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const composingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const relationshipSuggestions = useMemo(
    () => mergeRelationshipSuggestions(tempMembers.map(member => member.relationship)),
    [tempMembers],
  );
  const selectedAgencyMaster = agencyMasters.find(master => master.id === selectedAgencyMasterId);
  const hasAgencyFields = Boolean(tempAgency.name.trim() && tempAgency.representative.trim() && tempAgency.phone.trim());
  // 案件のロゴはマスターのスナップショットなので、マスター側を直しても自動では追従しない。差分は明示する
  const masterLogoDiffers = Boolean(selectedAgencyMaster) && (selectedAgencyMaster?.logoDataUrl ?? '') !== (tempAgency.logoDataUrl ?? '');
  const sectionConfig = {
    family: { title: '世帯・家族情報の修正', icon: Users },
    valuation: { title: '現在評価用の為替レート', icon: DollarSign },
    agency: { title: '代理店情報の修正', icon: Building2 },
  }[section];
  const SectionIcon = sectionConfig.icon;

  useEffect(() => {
    if (section !== 'agency') return;
    let ignore = false;
    fetchAgencyMasters()
      .then(masters => {
        if (ignore) return;
        setAgencyMasters(sortAgencyMasters(masters));
        // 代理店名・取扱者・電話が一致するマスターは選択済みにしておく（ロゴ差分の案内に使う）
        const matched = masters.find(master =>
          master.name === agency.name
          && master.representative === agency.representative
          && master.phone === agency.phone);
        if (matched) setSelectedAgencyMasterId(matched.id);
      })
      .catch(() => {
        if (!ignore) setAgencyMasterNotice({ type: 'error', text: '代理店マスターの読み込みに失敗しました' });
      });
    return () => {
      ignore = true;
    };
  }, [section, agency]);

  const handleAddMember = () => {
    const newMember: FamilyMember = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      nameKana: '',
      relationship: '',
      birthDate: '',
      gender: 'male'
    };
    setTempMembers([...tempMembers, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    if (tempMembers.length <= 1) return;
    setTempMembers(tempMembers.filter(m => m.id !== id));
  };

  const updateMember = (id: string, field: keyof FamilyMember, value: string) => {
    const finalValue = (field === 'nameKana' && !composingRef.current) ? toKatakana(value) : value;
    setTempMembers(tempMembers.map(m => m.id === id ? { ...m, [field]: finalValue } : m));
  };

  const handleLoadAgencyMaster = (masterId: string) => {
    const master = agencyMasters.find(m => m.id === masterId);
    if (master) {
      setSelectedAgencyMasterId(masterId);
      // 印刷可否は案件ごとの設定なのでマスター呼び出しでは引き継がない
      setTempAgency(current => ({
        name: master.name,
        representative: master.representative,
        phone: master.phone,
        logoDataUrl: master.logoDataUrl,
        printLogo: current.printLogo,
      }));
      setAgencyMasterNotice({ type: 'success', text: '代理店マスターを呼び出しました' });
    }
  };

  const setAgencyField = (field: keyof Agency, value: string) => {
    setTempAgency(current => ({ ...current, [field]: value }));
    setAgencyMasterNotice(null);
    setSubmitError(null);
  };

  const handleLogoChange = (logoDataUrl: string | undefined) => {
    setTempAgency(current => ({ ...current, logoDataUrl }));
    setAgencyMasterNotice(null);
  };

  const getAgencyPayload = (): Omit<AgencyMaster, 'id'> | null => {
    const payload = {
      name: tempAgency.name.trim(),
      representative: tempAgency.representative.trim(),
      phone: tempAgency.phone.trim(),
      logoDataUrl: tempAgency.logoDataUrl,
    };
    if (!payload.name || !payload.representative || !payload.phone) return null;
    return payload;
  };

  const handleCreateAgencyMaster = async () => {
    const payload = getAgencyPayload();
    if (!payload) {
      setAgencyMasterNotice({ type: 'error', text: '代理店情報をすべて入力してください' });
      return;
    }

    setIsAgencyMasterSaving(true);
    try {
      const created = await createAgencyMaster(payload);
      setAgencyMasters(current => sortAgencyMasters([...current, created]));
      setSelectedAgencyMasterId(created.id);
      setAgencyMasterNotice({ type: 'success', text: '代理店マスターに保存しました' });
    } catch {
      setAgencyMasterNotice({ type: 'error', text: '代理店マスターの保存に失敗しました' });
    } finally {
      setIsAgencyMasterSaving(false);
    }
  };

  const handleUpdateAgencyMaster = async () => {
    const payload = getAgencyPayload();
    if (!payload) {
      setAgencyMasterNotice({ type: 'error', text: '代理店情報をすべて入力してください' });
      return;
    }
    if (!selectedAgencyMasterId) {
      setAgencyMasterNotice({ type: 'error', text: '更新する代理店マスターを選択してください' });
      return;
    }

    setIsAgencyMasterSaving(true);
    try {
      const updated = await updateAgencyMaster(selectedAgencyMasterId, payload);
      setAgencyMasters(current => sortAgencyMasters(current.map(master => master.id === selectedAgencyMasterId ? updated : master)));
      setAgencyMasterNotice({ type: 'success', text: '代理店マスターを更新しました' });
    } catch {
      setAgencyMasterNotice({ type: 'error', text: '代理店マスターの更新に失敗しました' });
    } finally {
      setIsAgencyMasterSaving(false);
    }
  };

  // Enterで即送信（＝保存して画面が閉じる）のを止め、次の入力欄へ送る。
  // 保存はフッターの保存ボタンからだけ行う
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    // IME変換確定のEnterは入力操作なので拾わない
    if (composingRef.current || (e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;

    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    // ボタン・textareaの改行は本来の挙動のまま
    if (tag === 'button' || tag === 'textarea') return;
    if (tag !== 'input' && tag !== 'select') return;

    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const fields = Array.from(form.querySelectorAll<HTMLElement>('input, select, textarea'))
      .filter(el => !(el as HTMLInputElement).disabled && el.tabIndex !== -1 && el.offsetParent !== null);
    const index = fields.indexOf(target);
    const next = index >= 0 ? fields[index + 1] : undefined;

    if (next) {
      next.focus();
      if (next instanceof HTMLInputElement && (next.type === 'text' || next.type === 'number')) next.select();
      return;
    }
    // 最後の欄まで来たら保存ボタンへ。もう一度Enterを押せば保存できる
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (section === 'valuation' && hasUsdPolicies && tempValuationSettings.usdJpyRate <= 0) {
      setSubmitError('ドル建て証券があるため、現在評価用のUSD/JPYレートを入力してください');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(tempMembers, {
        name: tempAgency.name.trim(),
        representative: tempAgency.representative.trim(),
        phone: tempAgency.phone.trim(),
        logoDataUrl: tempAgency.logoDataUrl,
        printLogo: tempAgency.printLogo !== false,
      }, tempValuationSettings);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-overlay">
      <div className={`form-container ${section === 'family' ? 'wide-form' : 'settings-form'}`}>
        <div className="modal-header">
          <div className="title-with-icon">
            <SectionIcon className="icon" />
            <h3>{sectionConfig.title}</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="閉じる"><X size={20} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
          {section === 'family' && (
            <>
              <datalist id="customer-relationship-suggestions">
                {relationshipSuggestions.map(value => <option key={value} value={value} />)}
              </datalist>
              <div className="family-list">
                {tempMembers.map((member, index) => (
                  <div key={member.id} className="family-member-row">
                    <div className="form-group small"><label className="label-with-hint">続柄 <span>候補選択・直接入力</span></label>
                      <input type="text" list="customer-relationship-suggestions" value={member.relationship} placeholder={index === 0 ? "例: 本人" : "例: 長男、妻など"}
                        onChange={e => updateMember(member.id, 'relationship', e.target.value)} required />
                    </div>
                    <div className="form-group"><label>氏名</label>
                      <input type="text" value={member.name} onChange={e => updateMember(member.id, 'name', e.target.value)} required />
                    </div>
                    <div className="form-group"><label>フリガナ</label>
                      <input type="text" value={member.nameKana} placeholder="カタカナ"
                        onCompositionStart={() => { composingRef.current = true; }}
                        onCompositionEnd={e => { composingRef.current = false; updateMember(member.id, 'nameKana', e.currentTarget.value); }}
                        onChange={e => updateMember(member.id, 'nameKana', e.target.value)} />
                    </div>
                    <div className="form-group"><label>生年月日（任意）</label>
                      <input type="date" value={member.birthDate} onChange={e => updateMember(member.id, 'birthDate', e.target.value)} />
                    </div>
                    <div className="form-group small"><label>性別</label>
                      <select value={member.gender} onChange={e => updateMember(member.id, 'gender', e.target.value)}>
                        <option value="male">男</option><option value="female">女</option>
                      </select>
                    </div>
                    <button type="button" className="remove-btn" onClick={() => handleRemoveMember(member.id)} aria-label={`${member.name || `${index + 1}人目`}を削除`}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-member-btn" onClick={handleAddMember}><Plus size={16} /> 家族を追加</button>
            </>
          )}

          {section === 'valuation' && (
            <>
              <div className="form-context-note" role="note">
                ドル建て死亡保障・解約返戻金などの現在円換算に、すべての証券で共通して使用します。
              </div>
              <div className="grid-form valuation-settings-grid">
                <div className="form-group">
                  <label>USD/JPYレート（1 USD = 円）{hasUsdPolicies && <span className="required-mark">*</span>}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={tempValuationSettings.usdJpyRate || ''}
                    onChange={e => setTempValuationSettings(current => ({
                      ...current,
                      usdJpyRate: Number(e.target.value),
                    }))}
                    placeholder="例：160.00"
                    required={hasUsdPolicies}
                  />
                </div>
                <div className="form-group">
                  <label>為替レート基準日</label>
                  <input
                    type="date"
                    value={tempValuationSettings.fxRateDate}
                    onChange={e => setTempValuationSettings(current => ({
                      ...current,
                      fxRateDate: e.target.value,
                    }))}
                  />
                </div>
              </div>
            </>
          )}

          {section === 'agency' && (
            <>
              <div className="agency-master-tools">
                <div className="form-group">
                  <label><Download size={14} style={{marginRight: '4px', verticalAlign: '-2px'}} />代理店マスター</label>
                  <select value={selectedAgencyMasterId} onChange={e => { setSelectedAgencyMasterId(e.target.value); if (e.target.value) handleLoadAgencyMaster(e.target.value); }}>
                    <option value="">選択してください</option>
                    {agencyMasters.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.representative})</option>
                    ))}
                  </select>
                </div>
                <div className="agency-master-actions">
                  <button
                    type="button"
                    className="agency-master-action-btn"
                    onClick={handleCreateAgencyMaster}
                    disabled={!hasAgencyFields || isAgencyMasterSaving}
                  >
                    <Save size={15} /> 新規保存
                  </button>
                  <button
                    type="button"
                    className="agency-master-action-btn"
                    onClick={handleUpdateAgencyMaster}
                    disabled={!selectedAgencyMaster || !hasAgencyFields || isAgencyMasterSaving}
                  >
                    <RefreshCw size={15} /> 選択中を更新
                  </button>
                </div>
                {agencyMasterNotice && (
                  <div className={`agency-master-notice is-${agencyMasterNotice.type}`}>
                    {agencyMasterNotice.text}
                  </div>
                )}
              </div>
              <div className="grid-form">
                <div className="form-group"><label>代理店名</label>
                  <input type="text" value={tempAgency.name} onChange={e => setAgencyField('name', e.target.value)} required />
                </div>
                <div className="form-group"><label>取扱者名</label>
                  <input type="text" value={tempAgency.representative} onChange={e => setAgencyField('representative', e.target.value)} required />
                </div>
                <div className="form-group"><label>連絡先電話番号</label>
                  <input type="text" value={tempAgency.phone} onChange={e => setAgencyField('phone', e.target.value)} required />
                </div>
              </div>
              <div className="agency-logo-field">
                <label>ロゴ画像（任意）</label>
                <AgencyLogoPicker
                  value={tempAgency.logoDataUrl}
                  onChange={handleLogoChange}
                  onError={text => setAgencyMasterNotice({ type: 'error', text })}
                />
                {masterLogoDiffers && selectedAgencyMaster && (
                  <p className="agency-logo-diff">
                    代理店マスター「{selectedAgencyMaster.name}」のロゴと異なります。
                    <button type="button" className="agency-logo-diff-btn" onClick={() => handleLogoChange(selectedAgencyMaster.logoDataUrl)}>
                      {selectedAgencyMaster.logoDataUrl ? 'マスターのロゴを取り込む' : 'マスターに合わせて外す'}
                    </button>
                  </p>
                )}
                <label className="agency-logo-toggle">
                  <input
                    type="checkbox"
                    checked={tempAgency.printLogo !== false}
                    onChange={e => setTempAgency(current => ({ ...current, printLogo: e.target.checked }))}
                  />
                  印刷時に表紙へロゴを表示する
                </label>
              </div>
            </>
          )}

          {submitError && <div className="agency-master-notice is-error">{submitError}</div>}

          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button type="submit" className="save-btn" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : `${sectionConfig.title}を保存`}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose} style={{ flex: 1 }}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
