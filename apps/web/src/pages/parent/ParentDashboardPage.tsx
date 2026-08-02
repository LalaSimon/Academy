import { useNavigate } from 'react-router-dom';
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useParentProfile } from '@/hooks/useParentProfile';
import { usePayments } from '@/hooks/usePayments';
import { useQueries } from '@tanstack/react-query';
import { useClasses } from '@/hooks/useClasses';
import { TodaySchedule } from '@/components/classes/TodaySchedule';
import { api } from '@/lib/api';
import type { UserDetail } from '@/hooks/useUsers';

function ChildPaymentSummary({ childId, childName }: { childId: string; childName: string }) {
  const { data } = usePayments({ studentId: childId });
  const navigate = useNavigate();

  const pending = data?.data.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE') ?? [];
  const overdue = data?.data.filter((p) => p.status === 'OVERDUE') ?? [];

  return (
    <button
      onClick={() => navigate(`/parent/children/${childId}/payments`)}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            {childName.split(' ')[0]?.[0]}{childName.split(' ')[1]?.[0]}
          </div>
          <span className="font-medium text-foreground text-sm">{childName}</span>
        </div>
        <CreditCard className="w-4 h-4 text-muted-foreground" />
      </div>
      {pending.length === 0 ? (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Wszystkie opłaty uregulowane</span>
        </div>
      ) : (
        <div className="space-y-1">
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{overdue.length} zaległa płatność</span>
            </div>
          )}
          {pending.filter(p => p.status === 'PENDING').length > 0 && (
            <div className="flex items-center gap-2 text-amber-500 text-sm">
              <CreditCard className="w-4 h-4" />
              <span>{pending.filter(p => p.status === 'PENDING').length} oczekująca płatność</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function ChildUpcomingClasses({ childId }: { childId: string }) {
  const navigate = useNavigate();
  const { data: profile } = useQueries({
    queries: [{
      queryKey: ['users', childId],
      queryFn: () => api.get<UserDetail>(`/users/${childId}`).then((r) => r.data),
    }],
    combine: (results) => results[0],
  });

  const groupIds = profile?.studentGroups?.map((sg) => sg.group.id) ?? [];

  // Jedno zapytanie zamiast osobnego na każdą grupę — backend od Fazy 5.2
  // zawęża `GET /classes` do dzieci rodzica, więc filtrujemy tylko po tym,
  // czyje to dziecko. Łapie też lekcje 1:1, pomijane przy pytaniu per grupie.
  const { data: classesData, isLoading } = useClasses({ limit: 100 });
  const childClasses = (classesData?.data ?? []).filter(
    (c) =>
      (c.group && groupIds.includes(c.group.id)) || c.student?.id === childId,
  );

  const upcoming = childClasses
    .filter((c) => c.status === 'SCHEDULED' && new Date(c.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Dziś — z linkiem do spotkania i materiałami; rodzic często sadza
          dziecko do komputera, więc potrzebuje tego samego co uczeń. */}
      <TodaySchedule
        classes={childClasses}
        isLoading={isLoading}
        title="Dziś"
        emptyText="Dziecko nie ma dziś zajęć."
      />

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] text-muted-foreground">Kolejne zajęcia</p>
          {upcoming.map((cls) => (
            <button
              key={cls.id}
              onClick={() => navigate(`/parent/children/${childId}/classes`)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <Calendar className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{cls.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cls.scheduledAt).toLocaleDateString('pl-PL', {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParentDashboardPage() {
  const { data: profile, isLoading } = useParentProfile();
  const navigate = useNavigate();

  const children = profile?.asParent?.map((p) => p.student) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-violet-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Brak przypisanych dzieci</h2>
        <p className="text-muted-foreground text-sm">Skontaktuj się z administracją szkoły.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {children.length === 1 ? 'Twoje dziecko' : `Twoje dzieci (${children.length})`}
        </p>
      </div>

      <div className="grid gap-6">
        {children.map((child) => (
          <div key={child.id} className="rounded-2xl border border-border bg-card p-6 space-y-5">
            {/* Child header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  {child.firstName[0]}{child.lastName[0]}
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{child.firstName} {child.lastName}</h2>
                </div>
              </div>
              <button
                onClick={() => navigate(`/parent/children/${child.id}/classes`)}
                className="text-xs text-violet-500 hover:text-violet-600 font-medium"
              >
                Zobacz profil →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment summary */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Płatności</p>
                <ChildPaymentSummary childId={child.id} childName={`${child.firstName} ${child.lastName}`} />
              </div>

              {/* Upcoming classes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nadchodzące zajęcia</p>
                <ChildUpcomingClasses childId={child.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
