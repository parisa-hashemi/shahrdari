import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import type { ApprovalState, ReviewBundle } from '@/types/domain';
import { reviewsApi } from '@/api/governance';
import { DataTable, type Column } from '@/components/tables/DataTable';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  StatusBadge,
  Timeline,
  type Tone,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/overlays';
import { Field, TextArea, Select } from '@/components/ui/inputs';
import { Callout, EmptyState, LoadingState } from '@/components/ui/feedback';
import { ApprovalScopeNotice, DemoBadge, usePermission } from '@/components/workflow';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { violatesSeparationOfDuties } from '@/utils/permissions';
import { approvalStateLabels, reviewDimensionLabels, roleLabels } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber, formatRelative, shortHash } from '@/utils/format';

const STATE_TONE: Record<ApprovalState, { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'pending' | 'blocked' }> = {
  pending: { tone: 'warning', kind: 'pending' },
  approved: { tone: 'success', kind: 'ok' },
  rejected: { tone: 'danger', kind: 'error' },
  changes_requested: { tone: 'warning', kind: 'warn' },
  withdrawn: { tone: 'muted', kind: 'blocked' },
};

const SUBJECT_LABELS: Record<ReviewBundle['subjectType'], string> = {
  study: 'مطالعه',
  report: 'گزارش',
  dataset_version: 'نسخه داده',
  rule_pack: 'بسته قوانین',
  scenario: 'سناریو',
};

function ReviewTable({ rows, emptyTitle }: { rows: ReviewBundle[]; emptyTitle: string }) {
  const columns: Column<ReviewBundle>[] = [
    {
      key: 'subject',
      header: 'موضوع',
      sortValue: (r) => r.subjectTitle,
      cell: (r) => (
        <div className="min-w-0">
          <Link to={`/reviews/${r.id}`} className="font-medium hover:text-primary-700">
            {r.subjectTitle}
          </Link>
          <p className="text-2xs text-muted">
            {SUBJECT_LABELS[r.subjectType]} · <Ltr>{r.code}</Ltr>
          </p>
        </div>
      ),
    },
    {
      key: 'dimension',
      header: 'بُعد بررسی',
      cell: (r) => <Badge tone="muted">{reviewDimensionLabels[r.dimension] ?? r.dimension}</Badge>,
    },
    {
      key: 'assignee',
      header: 'مسئول',
      sortValue: (r) => r.assignedTo,
      cell: (r) => (
        <span className="text-xs">
          {r.assignedTo}
          <span className="block text-2xs text-muted">{roleLabels[r.assignedRole]}</span>
        </span>
      ),
    },
    {
      key: 'state',
      header: 'وضعیت',
      sortValue: (r) => r.state,
      cell: (r) => (
        <StatusBadge
          label={approvalStateLabels[r.state]}
          tone={STATE_TONE[r.state].tone}
          kind={STATE_TONE[r.state].kind}
        />
      ),
    },
    {
      key: 'submitted',
      header: 'ارسال',
      sortValue: (r) => r.submittedAt,
      cell: (r) => (
        <span className="text-xs text-muted">
          {r.submittedBy}
          <span className="block text-2xs">{formatRelative(r.submittedAt)}</span>
        </span>
      ),
    },
    {
      key: 'stale',
      header: 'هم‌ترازی',
      cell: (r) =>
        r.staleAgainstCurrent ? (
          <StatusBadge label="نسخه جاری تغییر کرده" tone="warning" kind="warn" />
        ) : (
          <StatusBadge label="هم‌تراز با نسخه ارسالی" tone="muted" kind="ok" />
        ),
      optional: true,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      caption="فهرست بررسی‌ها"
      emptyTitle={emptyTitle}
      emptyDescription="هنگامی که موردی برای بررسی ارسال شود، در این فهرست دیده می‌شود."
    />
  );
}

/* ------------------------------------------------------------- review inbox */

export function ReviewInboxPage() {
  const [state, setState] = useState('all');
  const { data, isLoading } = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.list });

  if (isLoading) return <LoadingState rows={4} />;
  const reviews = (data ?? []).filter((r) => state === 'all' || r.state === state);

  return (
    <div>
      <PageHeader
        eyebrow="حاکمیت و خروجی"
        title="بررسی و تأیید"
        description="هر بسته بررسی، نسخه‌ای ثابت از وضعیت ارسال‌شده است. تغییرات بعدی، آنچه بازبین دیده را تغییر نمی‌دهد."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'بررسی و تأیید' }]}
        meta={<DemoBadge />}
        actions={
          <Select
            aria-label="وضعیت"
            value={state}
            onChange={(event) => setState(event.target.value)}
            options={[
              { value: 'all', label: 'همه وضعیت‌ها' },
              ...(Object.keys(approvalStateLabels) as ApprovalState[]).map((key) => ({
                value: key,
                label: approvalStateLabels[key],
              })),
            ]}
          />
        }
      />
      <div className="mb-4">
        <ApprovalScopeNotice />
      </div>
      <ReviewTable rows={reviews} emptyTitle="موردی برای بررسی وجود ندارد" />
    </div>
  );
}

/* --------------------------------------------------------------- approvals */

export function ApprovalsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.list });
  const user = useAuthStore((s) => s.user);
  const permission = usePermission('approval.decide');

  if (isLoading) return <LoadingState rows={4} />;
  const rows = (data ?? []).filter((r) => r.dimension === 'decision_endorsement' || r.assignedRole === 'APPROVING_AUTHORITY');

  return (
    <div>
      <PageHeader
        eyebrow="حاکمیت و خروجی"
        title="موارد در انتظار تأیید"
        description="تأیید نهایی جدا از بررسی فنی است. مرجع تأیید، نتیجه بررسی‌های پیشین را می‌بیند اما جای آن‌ها تصمیم نمی‌گیرد."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'بررسی و تأیید', to: '/reviews' },
          { label: 'تأیید' },
        ]}
        meta={<DemoBadge />}
      />
      {!permission.allowed && (
        <Callout tone="neutral" className="mb-4">
          {permission.reason} فهرست زیر برای شفافیت نمایش داده می‌شود، اما ثبت تصمیم با نقش فعلی ({roleLabels[user.roles[0]]}) ممکن نیست.
        </Callout>
      )}
      <ReviewTable rows={rows} emptyTitle="موردی در انتظار تأیید نیست" />
    </div>
  );
}

/* ------------------------------------------------------------ review detail */

export function ReviewDetailPage() {
  const { reviewId = '' } = useParams();
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const decidePerm = usePermission('review.decide');
  const commentPerm = usePermission('review.comment');

  const { data, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewsApi.get(reviewId),
  });

  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject' | 'request_changes') =>
      reviewsApi.decide(reviewId, decision, reason, user.displayName),
    onSuccess: (_result, decision) => {
      queryClient.invalidateQueries();
      setReason('');
      pushToast({
        title:
          decision === 'approve'
            ? 'بررسی تأیید شد'
            : decision === 'reject'
              ? 'بررسی رد شد'
              : 'درخواست اصلاح ثبت شد',
        variant: decision === 'approve' ? 'success' : 'warning',
      });
    },
  });

  const addComment = useMutation({
    mutationFn: () => reviewsApi.comment(reviewId, comment, 'کل بسته', user.displayName),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setComment('');
      pushToast({ title: 'یادداشت ثبت شد', variant: 'success' });
    },
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (!data) return <EmptyState title="بسته بررسی یافت نشد" />;

  const selfReview = violatesSeparationOfDuties(user.displayName, data.submittedBy);
  const decided = data.state !== 'pending';
  const denial =
    decidePerm.reason ??
    (decided ? 'تصمیم این بسته پیش‌تر ثبت شده است.' : null) ??
    (selfReview ? 'ارسال‌کننده نمی‌تواند بررسی همان بسته را تأیید کند (تفکیک وظایف).' : null) ??
    (reason.trim().length < 8 ? 'برای ثبت تصمیم، دلیل را بنویسید.' : null);

  return (
    <div>
      <PageHeader
        title={data.subjectTitle}
        description={`بسته بررسی ${SUBJECT_LABELS[data.subjectType]} — ${reviewDimensionLabels[data.dimension] ?? data.dimension}`}
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'بررسی و تأیید', to: '/reviews' },
          { label: data.subjectTitle },
        ]}
        meta={
          <>
            <Ltr className="text-xs text-muted">{data.code}</Ltr>
            <StatusBadge
              label={approvalStateLabels[data.state]}
              tone={STATE_TONE[data.state].tone}
              kind={STATE_TONE[data.state].kind}
            />
            <Badge tone="muted" icon={<Lock size={11} />}>
              نسخه ثابت — <Ltr>{shortHash(data.bundleHash)}</Ltr>
            </Badge>
            <DemoBadge />
          </>
        }
      />

      <Callout tone="neutral" className="mb-4" title="این بسته تغییرناپذیر است">
        آنچه می‌بینید همان چیزی است که در زمان ارسال ثبت شده. اگر نسخه جاری موضوع پس از ارسال تغییر کرده
        باشد، این بسته به‌روزرسانی نمی‌شود و تفاوت به شما اعلام می‌شود.
      </Callout>

      {data.staleAgainstCurrent && (
        <Callout tone="warning" className="mb-4" title="نسخه جاری تغییر کرده است">
          پس از ارسال این بسته، نسخه جاری موضوع تغییر کرده است. تصمیم شما بر همین بسته ثبت می‌شود، نه بر
          نسخه جدید.
        </Callout>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="مشخصات بسته" />
            <DefinitionList
              columns={2}
              items={[
                { label: 'ارسال‌کننده', value: data.submittedBy },
                { label: 'زمان ارسال', value: formatJalaliDate(data.submittedAt, true) },
                { label: 'مسئول بررسی', value: `${data.assignedTo} (${roleLabels[data.assignedRole]})` },
                { label: 'گام گردش‌کار', value: data.stepKey },
                { label: 'اثر انگشت بسته', value: <Ltr>{data.bundleHash}</Ltr> },
                {
                  label: 'تصمیم ثبت‌شده',
                  value: data.decidedAt ? formatJalaliDate(data.decidedAt, true) : 'ثبت نشده است',
                },
              ]}
            />
            {data.decisionReason && (
              <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-[13px] leading-7">
                <p className="text-xs font-medium text-muted">دلیل تصمیم</p>
                {data.decisionReason}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="یادداشت‌های بررسی"
              subtitle={`${formatNumber(data.comments.length)} یادداشت`}
            />
            {data.comments.length === 0 ? (
              <p className="text-[13px] text-muted">یادداشتی ثبت نشده است.</p>
            ) : (
              <Timeline
                items={data.comments.map((item) => ({
                  id: item.id,
                  title: `${item.author} — ${roleLabels[item.role]}`,
                  meta: `${item.anchor} · ${formatRelative(item.at)}`,
                  body: (
                    <>
                      {item.text}
                      {item.requestedAction && (
                        <span className="mt-1 block text-xs">اقدام خواسته‌شده: {item.requestedAction}</span>
                      )}
                    </>
                  ),
                  tone: item.resolved ? 'success' : 'warning',
                }))}
              />
            )}

            <div className="mt-4 border-t border-border pt-4">
              <Field label="افزودن یادداشت" hint="یادداشت‌ها بخشی از سابقه تصمیم‌اند و حذف نمی‌شوند">
                {({ id }) => (
                  <TextArea
                    id={id}
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="مشاهده یا ابهام خود را بنویسید…"
                  />
                )}
              </Field>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  disabledReason={commentPerm.reason ?? (comment.trim() ? null : 'متن یادداشت خالی است.')}
                  loading={addComment.isPending}
                  onClick={() => addComment.mutate()}
                >
                  ثبت یادداشت
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="ثبت تصمیم" subtitle="دلیل تصمیم الزامی است و در سابقه ثبت می‌شود" />
            <Field label="دلیل تصمیم" required>
              {({ id }) => (
                <TextArea
                  id={id}
                  rows={4}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="مبنای تصمیم خود را بنویسید…"
                  disabled={decided}
                />
              )}
            </Field>
            <div className="mt-3 space-y-2">
              <Button
                variant="primary"
                block
                disabledReason={denial}
                loading={decide.isPending && pendingDecision === 'approve'}
                onClick={() => setPendingDecision('approve')}
              >
                تأیید
              </Button>
              <Button
                block
                disabledReason={denial}
                loading={decide.isPending && pendingDecision === 'request_changes'}
                onClick={() => setPendingDecision('request_changes')}
              >
                درخواست اصلاح
              </Button>
              <Button
                variant="danger"
                block
                disabledReason={denial}
                loading={decide.isPending && pendingDecision === 'reject'}
                onClick={() => setPendingDecision('reject')}
              >
                رد
              </Button>
            </div>
            {selfReview && (
              <p className="mt-3 text-xs leading-6 text-warning">
                شما ارسال‌کننده این بسته هستید؛ تفکیک وظایف اجازه تصمیم‌گیری روی کار خودتان را نمی‌دهد.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="دامنه این تصمیم" />
            <p className="text-[13px] leading-7 text-muted">
              تصمیم شما در بُعد «{reviewDimensionLabels[data.dimension] ?? data.dimension}» ثبت می‌شود و
              ابعاد دیگر را پوشش نمی‌دهد. تأیید در سامانه به‌معنای اعتبار قانونی، صدور پروانه یا گواهی علمی
              نیست.
            </p>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDecision)}
        title={
          pendingDecision === 'approve'
            ? 'ثبت تأیید'
            : pendingDecision === 'reject'
              ? 'ثبت رد'
              : 'ثبت درخواست اصلاح'
        }
        confirmLabel="ثبت تصمیم"
        tone={pendingDecision === 'reject' ? 'danger' : 'default'}
        busy={decide.isPending}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => {
          if (pendingDecision) decide.mutate(pendingDecision);
          setPendingDecision(null);
        }}
        description={
          <div className="space-y-2">
            <p>این تصمیم روی نسخه ثابت همین بسته ثبت می‌شود و قابل حذف نیست.</p>
            <p className="text-muted">دلیل ثبت‌شده: {reason}</p>
          </div>
        }
      />
    </div>
  );
}
