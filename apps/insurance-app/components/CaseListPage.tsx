'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Search, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, Building2, Home, Upload } from 'lucide-react';
import AgencyMasterModal from '@/components/AgencyMasterModal';
import { fetchCases, createCase, deleteCase, restoreJsonAppState } from '@/lib/api';
import type { CaseSummary } from '@/lib/api';

interface Props {
  onSelect: (caseId: string) => void;
}

type SortKey = 'name' | 'members' | 'policies' | 'updated';
type SortDir = 'asc' | 'desc';

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0);
}

function getAvatarColor(name: string): string {
  if (!name) return '#94a3b8';
  const colors = ['#3182ce', '#38a169', '#dd6b20', '#805ad5', '#d53f8c', '#319795', '#e53e3e'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function CaseListPage({ onSelect }: Props) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAgencyMaster, setShowAgencyMaster] = useState(false);
  const [isRestoringJson, setIsRestoringJson] = useState(false);
  const [isJsonDragOver, setIsJsonDragOver] = useState(false);
  const restoreJsonInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCases();
      setCases(data);
    } catch {
      setError('案件一覧の取得に失敗しました');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      const newCase = await createCase();
      onSelect(newCase.id);
    } catch {
      setError('案件の作成に失敗しました');
    }
  };

  const restoreJsonFile = useCallback(async (file: File | null) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('JSONファイル(.json)を選択してください');
      return;
    }

    if (!window.confirm('JSONから新しいお客様データを復元しますか？')) return;

    setIsRestoringJson(true);
    setError(null);
    let createdCaseId: string | null = null;

    try {
      const newCase = await createCase();
      createdCaseId = newCase.id;
      await restoreJsonAppState(newCase.id, file);
      onSelect(newCase.id);
    } catch {
      if (createdCaseId) {
        await deleteCase(createdCaseId).catch(() => {});
      }
      setError('JSON復元に失敗しました。保険アプリのJSON出力ファイルか確認してください。');
      await load().catch(() => {});
    } finally {
      setIsRestoringJson(false);
    }
  }, [load, onSelect]);

  const handleRestoreJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    await restoreJsonFile(file);
  };

  const handleJsonDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsJsonDragOver(false);
    if (isRestoringJson) return;
    void restoreJsonFile(e.dataTransfer.files[0] ?? null);
  }, [isRestoringJson, restoreJsonFile]);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const label = name || '(未入力)';
    if (!window.confirm(`「${label}」を削除しますか？\nこの操作は元に戻せません。`)) return;
    try {
      await deleteCase(id);
      setCases(prev => prev.filter(c => c.id !== id));
    } catch {
      setError('案件の削除に失敗しました');
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? cases.filter(c =>
          (c.primaryMemberName || '').toLowerCase().includes(q) ||
          (c.primaryMemberNameKana || '').toLowerCase().includes(q)
        )
      : [...cases];

    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return (a.primaryMemberName || '').localeCompare(b.primaryMemberName || '', 'ja') * dir;
        case 'members':
          return (a.memberCount - b.memberCount) * dir;
        case 'policies':
          return (a.policyCount - b.policyCount) * dir;
        case 'updated': {
          const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return (at - bt) * dir;
        }
      }
    });
    return filtered;
  }, [cases, search, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="case-sort-icon-idle" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="case-sort-icon-active" />
      : <ArrowDown size={12} className="case-sort-icon-active" />;
  };

  return (
    <div className="case-list-page">
      <input
        ref={restoreJsonInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleRestoreJson}
      />
      <header className="case-list-header">
        <div className="case-list-title-block">
          <h1>
            <a href="/" className="back-to-list-btn" title="ポータルに戻る">
              <Home size={20} />
            </a>
            保険証券分析・診断ダッシュボード
          </h1>
          <p className="case-list-subtitle">
            お客様を選択してください
            {cases.length > 0 && <span className="case-list-total">（全 {cases.length} 件）</span>}
          </p>
        </div>
        <div className="case-list-actions">
          <button
            className="case-agency-btn"
            onClick={() => restoreJsonInputRef.current?.click()}
            disabled={isRestoringJson}
          >
            <Upload size={18} /> {isRestoringJson ? '復元中...' : 'JSON復元'}
          </button>
          <button className="case-agency-btn" onClick={() => setShowAgencyMaster(true)}>
            <Building2 size={18} /> 代理店管理
          </button>
          <button className="case-create-btn" onClick={handleCreate}>
            <Plus size={18} /> 新規お客様
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close-btn">&times;</button>
        </div>
      )}

      <div
        className={`case-json-dropzone ${isJsonDragOver ? 'case-json-dropzone-active' : ''} ${isRestoringJson ? 'case-json-dropzone-disabled' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isRestoringJson) setIsJsonDragOver(true);
        }}
        onDragLeave={() => setIsJsonDragOver(false)}
        onDrop={handleJsonDrop}
        onClick={() => !isRestoringJson && restoreJsonInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isRestoringJson) {
            e.preventDefault();
            restoreJsonInputRef.current?.click();
          }
        }}
        aria-disabled={isRestoringJson}
      >
        <Upload size={22} />
        <div>
          <p className="case-json-dropzone-title">
            {isRestoringJson ? 'JSON復元中...' : 'JSONファイルをドラッグ＆ドロップ'}
          </p>
          <p className="case-json-dropzone-sub">クリックしてファイル選択もできます</p>
        </div>
      </div>

      {!isLoading && cases.length > 0 && (
        <div className="case-search-bar">
          <Search size={16} className="case-search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="お客様名で検索..."
            className="case-search-input"
          />
          {search && (
            <span className="case-search-count">
              {filteredSorted.length} 件ヒット
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="loading-screen" style={{ height: 'auto', padding: '3rem' }}>
          読み込み中...
        </div>
      ) : cases.length === 0 ? (
        <div className="case-empty">
          <div className="case-empty-icon"><UserPlus size={48} /></div>
          <p className="case-empty-title">お客様が登録されていません</p>
          <p className="case-empty-sub">「新規お客様」ボタンから最初のお客様を登録しましょう</p>
          <button className="case-create-btn" onClick={handleCreate}>
            <Plus size={18} /> 最初のお客様を登録
          </button>
          <button
            className="case-agency-btn"
            onClick={() => restoreJsonInputRef.current?.click()}
            disabled={isRestoringJson}
          >
            <Upload size={18} /> JSONから復元
          </button>
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className="case-empty">
          <div className="case-empty-icon"><Search size={40} /></div>
          <p className="case-empty-title">該当するお客様が見つかりません</p>
          <p className="case-empty-sub">検索条件を変更してください</p>
        </div>
      ) : (
        <div className="case-table-wrapper">
          <table className="case-table">
            <thead>
              <tr>
                <th className="case-th-sortable" onClick={() => handleSort('name')}>
                  <span>お客様名</span> <SortIcon col="name" />
                </th>
                <th className="case-th-sortable case-th-numeric" onClick={() => handleSort('members')}>
                  <span>世帯人数</span> <SortIcon col="members" />
                </th>
                <th className="case-th-sortable case-th-numeric" onClick={() => handleSort('policies')}>
                  <span>証券数</span> <SortIcon col="policies" />
                </th>
                <th className="case-th-sortable" onClick={() => handleSort('updated')}>
                  <span>最終更新</span> <SortIcon col="updated" />
                </th>
                <th className="case-th-actions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSorted.map(c => {
                const displayName = c.primaryMemberName || '(未入力)';
                const avatarColor = getAvatarColor(c.primaryMemberName);
                return (
                  <tr key={c.id} className="case-row" onClick={() => onSelect(c.id)}>
                    <td className="case-name-cell">
                      <div className="case-name-wrapper">
                        <div className="case-avatar-sm" style={{ background: avatarColor }}>
                          {getInitial(c.primaryMemberName)}
                        </div>
                        <div>
                          <span className="case-primary-name">{displayName}</span>
                          {c.primaryMemberName && <span className="case-sama"> 様</span>}
                        </div>
                      </div>
                    </td>
                    <td className="case-td-numeric">
                      <span className="case-count-pill case-count-members">{c.memberCount}</span>
                      <span className="case-unit">名</span>
                    </td>
                    <td className="case-td-numeric">
                      <span className="case-count-pill case-count-policies">{c.policyCount}</span>
                      <span className="case-unit">件</span>
                    </td>
                    <td className="case-updated-cell">{formatDate(c.updatedAt)}</td>
                    <td className="case-td-actions">
                      <button
                        className="case-delete-btn"
                        onClick={(e) => handleDelete(e, c.id, c.primaryMemberName)}
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showAgencyMaster && <AgencyMasterModal onClose={() => setShowAgencyMaster(false)} />}
    </div>
  );
}
