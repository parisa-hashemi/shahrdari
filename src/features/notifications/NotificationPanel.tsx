import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Drawer } from '@/components/ui/overlays';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/ui/feedback';
import { StatusBadge, type Tone } from '@/components/ui/display';
import { notificationsApi } from '@/api/governance';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/cn';

const SEVERITY: Record<string, { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'info' }> = {
  success: { tone: 'success', kind: 'ok' },
  warning: { tone: 'warning', kind: 'warn' },
  error: { tone: 'danger', kind: 'error' },
  info: { tone: 'info', kind: 'info' },
};

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: notificationsApi.list });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="اعلان‌ها"
      subtitle="رویدادهای مرتبط با کارهای شما"
      footer={
        <Button size="sm" variant="secondary" block onClick={() => markAll.mutate()}>
          علامت‌گذاری همه به‌عنوان خوانده‌شده
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState rows={3} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="اعلانی وجود ندارد"
          description="هنگامی که تحلیلی تکمیل شود، داده‌ای نیازمند بررسی باشد یا موردی برای تأیید ارجاع شود، اینجا نمایش داده می‌شود."
        />
      ) : (
        <ul className="space-y-2">
          {data.map((item) => {
            const severity = SEVERITY[item.severity];
            return (
              <li
                key={item.id}
                className={cn(
                  'rounded-lg border p-3',
                  item.read ? 'border-border bg-surface' : 'border-primary-200 bg-primary-50/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-6">{item.title}</p>
                  <StatusBadge label="" tone={severity.tone} kind={severity.kind} className="shrink-0" />
                </div>
                <p className="mt-1 text-xs leading-6 text-muted">{item.body}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-2xs text-faint">{formatRelative(item.at)}</span>
                  <span className="flex gap-2">
                    {item.link && (
                      <Link
                        to={item.link}
                        onClick={onClose}
                        className="text-2xs text-primary-700 hover:underline"
                      >
                        مشاهده
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(item.id)}
                        className="text-2xs text-muted hover:text-text"
                      >
                        خوانده شد
                      </button>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
