import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Send, Sparkles } from 'lucide-react';
import type { CopilotMessage } from '@/types/domain';
import { copilotApi } from '@/api/copilot';
import { Badge, Card, CardHeader, Ltr, PageHeader } from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/inputs';
import { Callout, PermissionDeniedState, Skeleton } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { useUiStore } from '@/stores/uiStore';
import { deterministicId } from '@/utils/id';
import { formatRelative } from '@/utils/format';
import { cn } from '@/utils/cn';

const SUGGESTIONS = [
  'ظرفیت جمعیت سناریوی افزایش تراکم چقدر است؟',
  'چرا تحلیل دسترسی و پوشش نتیجه‌ای ندارد؟',
  'کسری پارکینگ در سناریوی پیشنهادی چقدر است و بر چه مبنایی محاسبه شده؟',
  'کدام نسخه داده در آخرین اجرا استفاده شده است؟',
];

export default function CopilotPage() {
  const permission = usePermission('copilot.use');
  const pushToast = useUiStore((s) => s.pushToast);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: 'سلام. من می‌توانم نتایج ثبت‌شده، نسخه داده‌ها و دلیل نبود برخی خروجی‌ها را توضیح دهم. هر پاسخ با ارجاع به منبع همراه است و هیچ عددی را خودم برآورد نمی‌کنم.',
      at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (question: string) => copilotApi.ask(question, messages.length),
    onSuccess: (reply) => {
      setMessages((prev) => [...prev.filter((m) => !m.pending), reply]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });

  if (!permission.allowed) {
    return (
      <div>
        <PageHeader title="دستیار هوشمند" breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'دستیار' }]} />
        <PermissionDeniedState description={permission.reason ?? undefined} />
      </div>
    );
  }

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;
    setMessages((prev) => [
      ...prev,
      {
        id: deterministicId('msg', `${question}-${prev.length}`),
        role: 'user',
        text: question,
        at: new Date().toISOString(),
      },
    ]);
    setInput('');
    ask.mutate(question);
  };

  return (
    <div>
      <PageHeader
        title="دستیار هوشمند"
        description="دستیار فقط بر پایه داده و نتایج ثبت‌شده در سامانه پاسخ می‌دهد. تصمیم نمی‌گیرد، تأیید نمی‌کند و هر تغییری را پیش از اجرا برای تأیید صریح شما نمایش می‌دهد."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'دستیار هوشمند' }]}
        meta={<DemoBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card padded={false}>
          <div className="max-h-[560px] space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-start' : 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5',
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-border bg-surface-2',
                  )}
                >
                  <p className="whitespace-pre-wrap text-[13px] leading-7">{message.text}</p>

                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-2.5 border-t border-border pt-2">
                      <p className="mb-1.5 text-2xs text-muted">منابع پاسخ</p>
                      <ul className="space-y-1">
                        {message.citations.map((citation) => (
                          <li key={citation.label} className="flex flex-wrap items-center gap-1.5 text-2xs">
                            {citation.href && citation.accessible ? (
                              <Link to={citation.href} className="text-primary-700 hover:underline">
                                {citation.label}
                              </Link>
                            ) : (
                              <span className={citation.accessible ? '' : 'text-muted'}>{citation.label}</span>
                            )}
                            <Badge tone="muted">
                              <Ltr>{citation.versionLabel}</Ltr>
                            </Badge>
                            {!citation.accessible && <Badge tone="warning">دسترسی محدود</Badge>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {message.limitationNote && (
                    <p className="mt-2 rounded-md bg-warning-bg px-2 py-1.5 text-2xs leading-5 text-warning">
                      {message.limitationNote}
                    </p>
                  )}

                  {message.proposedAction && (
                    <div className="mt-2.5 rounded-lg border border-border bg-surface p-2.5">
                      <p className="text-xs font-medium">{message.proposedAction.title}</p>
                      <ul className="mt-1.5 list-disc space-y-0.5 ps-4 text-2xs leading-5 text-muted">
                        {message.proposedAction.preview.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabledReason={
                            message.proposedAction.permitted ? null : message.proposedAction.permissionNote ?? null
                          }
                          onClick={() =>
                            pushToast({
                              title: 'اقدام پیشنهادی اجرا شد',
                              description: 'پیش‌نویس ساخته شد و در بخش گزارش‌ها قابل ویرایش است.',
                              variant: 'success',
                            })
                          }
                        >
                          تأیید و اجرا
                        </Button>
                        <Button size="sm">انصراف</Button>
                      </div>
                    </div>
                  )}

                  <p
                    className={cn(
                      'mt-1.5 text-2xs',
                      message.role === 'user' ? 'text-white/70' : 'text-faint',
                    )}
                  >
                    {formatRelative(message.at)}
                  </p>
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex justify-end">
                <div className="w-64 rounded-xl border border-border bg-surface-2 p-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <TextArea
                rows={2}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                placeholder="پرسش خود را بنویسید…"
                aria-label="پرسش از دستیار"
              />
              <Button
                variant="primary"
                icon={<Send size={15} />}
                disabledReason={input.trim() ? null : 'ابتدا پرسشی بنویسید.'}
                loading={ask.isPending}
                onClick={() => send(input)}
              >
                ارسال
              </Button>
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="پرسش‌های پیشنهادی" icon={<Sparkles size={15} />} />
            <ul className="space-y-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => send(suggestion)}
                    className="w-full rounded-md border border-border px-2.5 py-2 text-start text-xs leading-6 hover:bg-surface-2"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Callout tone="neutral" title="مرزهای دستیار">
            <ul className="mt-1 list-disc space-y-1 ps-4">
              <li>عددی که در سامانه ثبت نشده باشد را تولید نمی‌کند.</li>
              <li>تأیید یا رد نمی‌کند و جای بازبین تصمیم نمی‌گیرد.</li>
              <li>هر تغییر داده، پیش از اجرا با پیش‌نمایش و تأیید صریح انجام می‌شود.</li>
              <li>به داده‌ای که دسترسی ندارید استناد نمی‌کند؛ فقط وجود آن را اعلام می‌کند.</li>
            </ul>
          </Callout>
        </aside>
      </div>
    </div>
  );
}
