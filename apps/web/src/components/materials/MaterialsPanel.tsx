import { useRef, useState } from 'react';
import { FileText, Video, Music, Image, Link2, File, Upload, Trash2, ExternalLink, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  useMaterials,
  useUploadMaterial,
  useCreateLinkMaterial,
  type Material,
  type MaterialType,
} from '@/hooks/useMaterials';

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  PDF: <FileText size={14} />,
  VIDEO: <Video size={14} />,
  AUDIO: <Music size={14} />,
  IMAGE: <Image size={14} />,
  LINK: <Link2 size={14} />,
  OTHER: <File size={14} />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  PDF: 'bg-red-100 text-red-700',
  VIDEO: 'bg-purple-100 text-purple-700',
  AUDIO: 'bg-yellow-100 text-yellow-700',
  IMAGE: 'bg-green-100 text-green-700',
  LINK: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

interface Props {
  /** Materials already assigned to this context */
  assigned: Material[];
  /** Called when user wants to remove a material from this context */
  onRemove: (materialId: string) => void;
  /** Called after upload/link-add — parent should assign the new material */
  onAssign: (materialId: string) => void;
  isRemoving?: boolean;
}

function AddLinkInline({ onAdd }: { onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const createLink = useCreateLinkMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = await createLink.mutateAsync({ title, url, type: 'LINK' });
    onAdd(m.id);
    setTitle(''); setUrl(''); setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
        <Link2 size={14} /> Dodaj link
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tytuł" required
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36" />
      <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-40" />
      <button type="submit" disabled={createLink.isPending}
        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
        {createLink.isPending ? '…' : 'Dodaj'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
    </form>
  );
}

function PickFromLibrary({ onPick, assignedIds }: { onPick: (id: string) => void; assignedIds: Set<string> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data } = useMaterials({ search: search || undefined, limit: 50 });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <Plus size={14} /> Wybierz z biblioteki
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Biblioteka materiałów</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj…"
        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
        {data?.data.map(m => (
          <div key={m.id} className="flex items-center justify-between py-1.5 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[m.type]}`}>
                {TYPE_ICONS[m.type]}
              </span>
              <span className="text-sm text-gray-800 truncate">{m.title}</span>
            </div>
            {assignedIds.has(m.id) ? (
              <span className="text-xs text-gray-400 shrink-0">Już dodany</span>
            ) : (
              <button onClick={() => { onPick(m.id); setOpen(false); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0 font-medium">
                Dodaj
              </button>
            )}
          </div>
        ))}
        {data?.data.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">Brak wyników</p>}
      </div>
    </div>
  );
}

export function MaterialsPanel({ assigned, onRemove, onAssign, isRemoving }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMaterial = useUploadMaterial();
  const assignedIds = new Set(assigned.map(m => m.id));

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      const m = await uploadMaterial.mutateAsync(formData);
      onAssign(m.id);
    }
  };

  const handleDownload = async (m: Material) => {
    if (!m.fileKey) { window.open(m.url, '_blank'); return; }
    try {
      const response = await api.get(`/materials/${m.id}/file`, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = objectUrl; a.download = m.title; a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Nie udało się pobrać pliku');
    }
  };

  return (
    <div className="space-y-3">
      {/* Assigned list */}
      {assigned.length > 0 ? (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {assigned.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_COLORS[m.type]}`}>
                {TYPE_ICONS[m.type]}
              </span>
              <span className="text-sm text-gray-800 flex-1 truncate">{m.title}</span>
              <button onClick={() => handleDownload(m)} className="p-1 text-gray-400 hover:text-indigo-600" title="Otwórz">
                <ExternalLink size={13} />
              </button>
              <button onClick={() => onRemove(m.id)} disabled={isRemoving}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-40" title="Usuń">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Brak przypisanych materiałów</p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMaterial.isPending}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <Upload size={14} /> {uploadMaterial.isPending ? 'Wgrywanie…' : 'Wgraj plik'}
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={e => e.target.files && handleUpload(e.target.files)} />
        <AddLinkInline onAdd={onAssign} />
        <PickFromLibrary onPick={onAssign} assignedIds={assignedIds} />
      </div>
    </div>
  );
}
