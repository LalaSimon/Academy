import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import {
  Bell,
  Calendar,
  CreditCard,
  XCircle,
  ClipboardList,
  Info,
  CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  useUnreadCount,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
  type NotificationType,
} from '@/hooks/useNotifications';

const TYPE_META: Record<
  NotificationType,
  { icon: LucideIcon; className: string }
> = {
  CLASS_REMINDER: { icon: Calendar, className: 'text-violet-500 bg-violet-500/10' },
  PAYMENT_REMINDER: { icon: CreditCard, className: 'text-amber-500 bg-amber-500/10' },
  CLASS_CANCELLED: { icon: XCircle, className: 'text-red-500 bg-red-500/10' },
  ATTENDANCE_ALERT: { icon: ClipboardList, className: 'text-orange-500 bg-orange-500/10' },
  GENERAL: { icon: Info, className: 'text-muted-foreground bg-muted' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'wczoraj';
  if (d < 7) return `${d} dni temu`;
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
  });
}

function NotificationRow({
  n,
  onRead,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.GENERAL;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => !n.isRead && onRead(n.id)}
      className={`w-full flex gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
        n.isRead ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${meta.className}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[13px] font-medium text-foreground">
            {n.title}
          </p>
          {!n.isRead && (
            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-violet-500" />
          )}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
          {n.body}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {relativeTime(n.createdAt)}
        </p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: 20 }, open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label="Powiadomienia"
            className="relative flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Bell className="h-[17px] w-[17px]" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-semibold leading-[15px] text-white">
                {badge}
              </span>
            )}
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="w-80 origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Powiadomienia
              </p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1 text-[12px] font-medium text-violet-500 transition-colors hover:text-violet-600 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Oznacz wszystkie
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {isLoading ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                  Ładowanie…
                </p>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                  <p className="text-[13px] text-muted-foreground">
                    Brak powiadomień
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      n={n}
                      onRead={(id) => markRead.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
