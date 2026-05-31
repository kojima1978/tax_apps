import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, FileSpreadsheet, FileIcon, Download, ExternalLink,
  ArrowLeft, Home, Sun, Moon, Plus, Pencil, Trash2, GripVertical, X, Upload,
} from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types ---

type Resource = {
  id: number;
  title: string;
  description: string;
  filename: string | null;
  url: string | null;
  sort_order: number;
};

// --- API helpers ---

const BASE = '/inheritance-tax-docs/api/resources/';

async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(BASE);
  return res.json();
}

async function createResource(form: FormData): Promise<Resource> {
  const res = await fetch(BASE, { method: 'POST', body: form });
  if (!res.ok) throw new Error((await res.json()).error ?? '登録に失敗しました');
  return res.json();
}

async function updateResource(id: number, form: FormData): Promise<Resource> {
  const res = await fetch(`${BASE}${id}/`, { method: 'PUT', body: form });
  if (!res.ok) throw new Error((await res.json()).error ?? '更新に失敗しました');
  return res.json();
}

async function deleteResource(id: number): Promise<void> {
  const res = await fetch(`${BASE}${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.json()).error ?? '削除に失敗しました');
}

async function reorderResources(ids: number[]): Promise<void> {
  await fetch(`${BASE}reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// --- Icon helper ---

const EXT_ICONS: Record<string, typeof FileText> = {
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  doc: FileIcon,
  docx: FileIcon,
};

function getIcon(resource: Resource) {
  if (!resource.filename) return FileText;
  const ext = resource.filename.split('.').pop() ?? '';
  return EXT_ICONS[ext] ?? FileText;
}

// --- Sortable Card ---

function SortableResourceCard({
  resource, basePath, index, onEdit, onDelete,
}: {
  resource: Resource;
  basePath: string;
  index: number;
  onEdit: (r: Resource) => void;
  onDelete: (r: Resource) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: resource.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExternal = !!resource.url;
  const Icon = getIcon(resource);
  const href = isExternal ? resource.url! : `${basePath}files/${resource.filename}`;

  return (
    <div ref={setNodeRef} style={style} className="group flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-all">
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : { download: resource.filename })}
        className="flex-1 flex items-start gap-3 min-w-0"
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            <span className="inline-flex items-center justify-center w-5 h-5 mr-1.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold leading-none">{index}</span>
            {resource.title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{resource.description}</p>
        </div>
        <div className="flex-shrink-0 self-center text-slate-400 dark:text-slate-500">
          {isExternal ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        </div>
      </a>

      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(resource)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50" title="編集">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(resource)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" title="削除">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// --- Form Modal ---

function ResourceFormModal({
  resource, onClose, onSaved,
}: {
  resource: Resource | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(resource?.title ?? '');
  const [description, setDescription] = useState(resource?.description ?? '');
  const [url, setUrl] = useState(resource?.url ?? '');
  const [mode, setMode] = useState<'file' | 'url'>(resource?.url ? 'url' : 'file');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('タイトルは必須です'); return; }
    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      if (mode === 'url') {
        form.append('url', url.trim());
        if (resource?.filename) form.append('removeFile', 'true');
      } else {
        if (file) form.append('file', file);
      }
      if (resource) {
        await updateResource(resource.id, form);
      } else {
        await createResource(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {resource ? 'リソース編集' : '新規リソース'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 rounded p-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">タイトル *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm resize-y"
          />
        </div>

        <div>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${mode === 'file' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
            >
              ファイル
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${mode === 'url' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}
            >
              外部リンク
            </button>
          </div>

          {mode === 'file' ? (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : resource?.filename ?? 'ファイルを選択'}
              </button>
            </div>
          ) : (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm"
            />
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-bold text-sm transition-colors"
          >
            {saving ? '保存中...' : resource ? '更新' : '登録'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Confirm Dialog ---

function ConfirmDeleteDialog({
  resource, onClose, onConfirmed,
}: {
  resource: Resource;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteResource(resource.id);
      onConfirmed();
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">削除確認</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          「{resource.title}」を削除しますか？{resource.filename && 'ファイルも削除されます。'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white rounded-lg font-bold text-sm"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 text-sm">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export const ResourcesPage = () => {
  const basePath = '/inheritance-tax-docs/';
  const { isDark, toggleDark } = useDarkMode();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Resource | null | undefined>(undefined); // undefined=closed, null=create
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = useCallback(async () => {
    try {
      const data = await fetchResources();
      setResources(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = resources.findIndex((r) => r.id === active.id);
    const newIndex = resources.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(resources, oldIndex, newIndex);
    setResources(newOrder);
    await reorderResources(newOrder.map((r) => r.id));
  }, [resources]);

  return (
    <div className="w-full animate-fade-in">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="ポータルに戻る">
                <Home className="h-5 w-5" />
                <span className="hidden md:inline text-sm font-medium">ポータル</span>
              </a>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="書類リストに戻る">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">書類リスト</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">参考資料</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 追加
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
      </div>

      <div className="p-4 md:px-8 md:py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            相続手続きに関する参考資料をダウンロードできます。ドラッグで並び替えが可能です。
          </p>

          {loading ? (
            <p className="text-center text-slate-400 py-10">読み込み中...</p>
          ) : resources.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 mb-4">リソースがありません</p>
              <button onClick={() => setEditTarget(null)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">
                最初のリソースを追加
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={resources.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-3">
                  {resources.map((resource, i) => (
                    <SortableResourceCard
                      key={resource.id}
                      resource={resource}
                      basePath={basePath}
                      index={i + 1}
                      onEdit={(r) => setEditTarget(r)}
                      onDelete={(r) => setDeleteTarget(r)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {editTarget !== undefined && (
        <ResourceFormModal
          resource={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={load}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          resource={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={load}
        />
      )}
    </div>
  );
};
