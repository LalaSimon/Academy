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
import axios from 'axios';

const TYPE_LABELS: Record<MaterialType, string> = {
  PDF: 'PDF',
  VIDEO: 'Wideo',
  AUDIO: 'Audio',
  IMAGE: 'Obraz',
  LINK: 'Link',
  OTHER: 'Inne',
};

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  PDF: <FileText size={16} />,
  VIDEO: <Video size={16} />,
  AUDIO: <Music size={16} />,
  IMAGE: <Image size={16} />,
  LINK: <Link2 size={16} />,
  OTHER: <File size={16} />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  PDF: 'bg-red-100 text-red-700',
  VIDEO: 'bg-purple-100 text-purple-700',
  AUDIO: 'bg-yellow-100 text-yellow-700',
  IMAGE: 'bg-green-100 text-green-700',
  LINK: 'bg-blue-100 text-blue-700',
  OTHER: 'bg-gray-100 text-gray-700',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Dodaj link zewnętrzny</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tytuł</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              placeholder="https://"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opis (opcjonalnie)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Anuluj</button>
            <button
              type="submit"
              disabled={createLink.isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {createLink.isPending ? 'Dodawanie…' : 'Dodaj'}
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

  const handleDownload = async (id: string, url: string, fileKey: string | null) => {
    if (!fileKey) { window.open(url, '_blank'); return; }
    const { data } = await axios.get<{ url: string }>(`/api/v1/materials/${id}/download`);
    window.open(data.url, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiały</h1>
          <p className="text-sm text-gray-500 mt-1">Pliki, dokumenty i linki edukacyjne</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Link2 size={16} /> Dodaj link
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
          >
            <Plus size={16} /> Wgraj plik
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
        className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-colors ${
          dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {uploading ? (
          <p className="text-sm text-indigo-600 font-medium">Wgrywanie…</p>
        ) : (
          <>
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Przeciągnij pliki tutaj lub <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:underline">wybierz z dysku</button></p>
            <p className="text-xs text-gray-400 mt-1">PDF, wideo, audio, obrazy — maks. 50 MB</p>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Szukaj materiałów…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as MaterialType | ''); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Wszystkie typy</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Ładowanie…</div>
      ) : !data?.data.length ? (
        <div className="text-center py-12 text-gray-400">
          <File size={40} className="mx-auto mb-2 opacity-30" />
          <p>Brak materiałów</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {data.data.map(m => (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${TYPE_COLORS[m.type]}`}>
                  {TYPE_ICONS[m.type]}
                  {TYPE_LABELS[m.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                  {m.description && <p className="text-xs text-gray-500 truncate">{m.description}</p>}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {m.uploader.firstName} {m.uploader.lastName}
                </div>
                <div className="text-xs text-gray-400 shrink-0">
                  {new Date(m.createdAt).toLocaleDateString('pl-PL')}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(m.id, m.url, m.fileKey)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                    title="Otwórz"
                  >
                    <ExternalLink size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                    title="Usuń"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Poprzednia
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {data.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Następna
              </button>
            </div>
          )}
        </>
      )}

      {showLinkModal && <LinkModal onClose={() => setShowLinkModal(false)} />}
    </div>
  );
}
