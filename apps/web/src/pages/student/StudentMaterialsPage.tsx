import { FileText, Video, Music, Image, Link2, File, ExternalLink, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useGroupMaterials, type MaterialType } from '@/hooks/useMaterials';
import type { Material } from '@/hooks/useMaterials';

const TYPE_LABELS: Record<MaterialType, string> = {
  PDF: 'PDF', VIDEO: 'Wideo', AUDIO: 'Audio', IMAGE: 'Obraz', LINK: 'Link', OTHER: 'Inne',
};

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  PDF: <FileText size={13} />, VIDEO: <Video size={13} />, AUDIO: <Music size={13} />,
  IMAGE: <Image size={13} />, LINK: <Link2 size={13} />, OTHER: <File size={13} />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  PDF: 'bg-red-500/15 text-red-400 border border-red-500/20',
  VIDEO: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  AUDIO: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  IMAGE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  LINK: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  OTHER: 'bg-muted/40 text-muted-foreground border border-border',
};

function GroupMaterialsSection({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { data: materials, isLoading } = useGroupMaterials(groupId);

  const handleOpen = async (m: Material) => {
    if (!m.fileKey) { window.open(m.url, '_blank'); return; }
    try {
      const response = await api.get(`/materials/${m.id}/file`, { responseType: 'blob' });
      const disposition = response.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename\*=UTF-8''(.+)/);
      const filename = match ? decodeURIComponent(match[1]) : m.title;
      const objectUrl = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = objectUrl; a.download = filename; a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Nie udało się pobrać pliku');
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">{groupName}</h2>
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-12 bg-muted/40 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-muted/40 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!materials?.length) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">{groupName}</h2>
        <div className="bg-card rounded-2xl border border-border p-4 text-center text-sm text-muted-foreground">
          Brak materiałów w tej grupie
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-2">{groupName}</h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
        {materials.map((m) => (
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
            <button
              onClick={() => handleOpen(m)}
              className="p-1.5 text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Otwórz / Pobierz"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentMaterialsPage() {
  const { data: profile, isLoading } = useStudentProfile();
  const groups = profile?.studentGroups ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Materiały</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pliki i linki z Twoich grup</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-32 bg-muted/40 rounded animate-pulse mb-2" />
              <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-5 w-12 bg-muted/40 rounded animate-pulse" />
                    <div className="flex-1 h-3 bg-muted/40 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Brak materiałów — nie jesteś przypisany do żadnej grupy</p>
        </div>
      )}

      {groups.map((sg) => (
        <GroupMaterialsSection key={sg.group.id} groupId={sg.group.id} groupName={sg.group.name} />
      ))}
    </div>
  );
}
