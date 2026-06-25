import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Link2,
  FileText,
  Video,
  Music,
  Image,
  File,
  Trash2,
  ExternalLink,
  Search,
  X,
  Plus,
} from 'lucide-react';
import { useMaterials, useUploadMaterial, useCreateLinkMaterial, useDeleteMaterial, type MaterialType } from '../../hooks/useMaterials';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const TYPE_LABELS: Record<MaterialType, string> = {
  PDF: 'PDF',
  VIDEO: 'Wideo',
  AUDIO: 'Audio',
  IMAGE: 'Obraz',
  LINK: 'Link',
  OTHER: 'Inne',
};

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  PDF: <FileText size={14} />,
  VIDEO: <Video size={14} />,
  AUDIO: <Music size={14} />,
  IMAGE: <Image size={14} />,
  LINK: <Link2 size={14} />,
  OTHER: <File size={14} />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  PDF: 'bg-red-500/15 text-red-400 border border-red-500/20',
  VIDEO: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  AUDIO: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  IMAGE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  LINK: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  OTHER: 'bg-muted/40 text-muted-foreground border border-border',
};

function LinkModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const createLink = useCreateLinkMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createLink.mutateAsync({ title, url, description: description || undefined, type: 'LINK' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Dodaj link zewnętrzny</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tytuł</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              placeholder="https://"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Opis (opcjonalnie)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Anuluj
            </button>
            <button
              type="submit"
              disabled={createLink.isPending}
              className="px-4 py-2 text-sm text-white rounded-xl disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            >
              {createLink.isPending ? 'Dodawanie...' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MaterialType | ''>('');
  const [page, setPage] = useState(1);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useMaterials({
    search: search || undefined,
    type: typeFilter || undefined,
    page,
    limit: 20,
  });

  const uploadMaterial = useUploadMaterial();
  const deleteMaterial = useDeleteMaterial();

  const handleFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.[^.]+$/, ''));
      await uploadMaterial.mutateAsync(formData);
    }
    setUploading(false);
  }, [uploadMaterial]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (id: string) => {
    if (confirm('Usunąć ten materiał?')) await deleteMaterial.mutateAsync(id);
  };

  const handleDownload = async (id: string, url: string, fileKey: string | null, title: string) => {
    if (!fileKey) { window.open(url, '_blank'); return; }
    try {
      const response = await api.get(`/materials/${id}/file`, { responseType: 'blob' });
      const disposition = response.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : title;
      const objectUrl = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Nie udało się pobrać pliku');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Materiały</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pliki, dokumenty i linki edukacyjne</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <Link2 size={14} /> Dodaj link
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            <Plus size={14} /> Wgraj plik
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragOver
            ? 'border-violet-500/60 bg-violet-500/5'
            : 'border-border hover:border-violet-500/30 hover:bg-accent/30'
        }`}
      >
        {uploading ? (
          <p className="text-sm text-violet-400 font-medium">Wgrywanie...</p>
        ) : (
          <>
            <Upload size={28} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              Przeciagnij pliki tutaj lub{' '}
              <button onClick={() => fileInputRef.current?.click()} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                wybierz z dysku
              </button>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">PDF, wideo, audio, obrazy - maks. 50 MB</p>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Szukaj materialow..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as MaterialType | ''); setPage(1); }}
          className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          <option value="">Wszystkie typy</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Ladowanie...</div>
      ) : !data?.data.length ? (
        <div className="text-center py-12">
          <File size={36} className="mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Brak materialow</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
            {data.data.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors group">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 ${TYPE_COLORS[m.type]}`}>
                  {TYPE_ICONS[m.type]}
                  {TYPE_LABELS[m.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{m.title}</p>
                  {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {m.uploader.firstName} {m.uploader.lastName}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(m.createdAt).toLocaleDateString('pl-PL')}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(m.id, m.url, m.fileKey, m.title)}
                    className="p-1.5 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
                    title="Otworz"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Usun"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground disabled:opacity-40 hover:bg-accent hover:text-foreground transition-all"
              >
                Poprzednia
              </button>
              <span className="px-3 py-1.5 text-xs text-muted-foreground">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground disabled:opacity-40 hover:bg-accent hover:text-foreground transition-all"
              >
                Nastepna
              </button>
            </div>
          )}
        </>
      )}

      {showLinkModal && <LinkModal onClose={() => setShowLinkModal(false)} />}
    </div>
  );
}
