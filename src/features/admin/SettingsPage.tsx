import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/governance';
import { regionsApi } from '@/api/catalog';
import { db } from '@/mocks/db';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  Tabs,
  Timeline,
} from '@/components/ui/display';
import { Callout, LoadingState, PermissionDeniedState } from '@/components/ui/feedback';
import { DemoBadge, usePermission } from '@/components/workflow';
import { config } from '@/services/config';
import { roleLabels, roleScopeNotes } from '@/utils/dictionary';
import { formatJalaliDate, formatNumber, formatRelative } from '@/utils/format';
import type { RoleCode } from '@/types/domain';

export default function SettingsPage() {
  const [tab, setTab] = useState('roles');
  const permission = usePermission('admin.access');
  const auditPerm = usePermission('audit.view');

  const { data: audit = [], isLoading } = useQuery({ queryKey: ['audit'], queryFn: auditApi.list });
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });
  const users = db.users();

  if (!permission.allowed) {
    return (
      <div>
        <PageHeader title="مدیریت سامانه" breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'مدیریت' }]} />
        <PermissionDeniedState description={permission.reason ?? undefined} />
      </div>
    );
  }

  if (isLoading) return <LoadingState rows={3} />;

  return (
    <div>
      <PageHeader
        title="مدیریت سامانه"
        description="نقش‌ها، دامنه دسترسی، پیکربندی محیط و سابقه رویدادها. دسترسی واقعی در سرویس پشتیبان اعمال می‌شود و تنظیمات این صفحه جای آن را نمی‌گیرد."
        breadcrumb={[{ label: 'خانه', to: '/dashboard' }, { label: 'مدیریت سامانه' }]}
        meta={<DemoBadge />}
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'roles', label: 'نقش‌ها و دسترسی' },
          { key: 'users', label: 'کاربران', badge: formatNumber(users.length) },
          { key: 'regions', label: 'مناطق و دامنه' },
          { key: 'audit', label: 'سابقه رویدادها' },
          { key: 'system', label: 'پیکربندی محیط' },
        ]}
      />

      {tab === 'roles' && (
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(roleLabels) as RoleCode[]).map((role) => (
            <Card key={role}>
              <CardHeader title={roleLabels[role]} action={<Ltr className="text-2xs text-faint">{role}</Ltr>} />
              <p className="text-[13px] leading-7 text-muted">{roleScopeNotes[role]}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <Card>
          <CardHeader title="کاربران نمایشی" subtitle="برای مشاهده تفاوت دسترسی‌ها می‌توانید نقش فعال را از نوار بالا تغییر دهید" />
          <ul className="divide-y divide-border">
            {users.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-[13px] font-medium">{user.displayName}</p>
                  <p className="text-xs text-muted">{user.organization}</p>
                </div>
                <span className="flex flex-wrap items-center gap-1.5">
                  {user.roles.map((role) => (
                    <Badge key={role} tone="primary">
                      {roleLabels[role]}
                    </Badge>
                  ))}
                  {user.grantValidTo && (
                    <Badge tone="warning">اعتبار تا {formatJalaliDate(user.grantValidTo)}</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'regions' && (
        <div className="grid gap-3 md:grid-cols-3">
          {regions.map((region) => (
            <Card key={region.id}>
              <CardHeader title={region.title} action={<Ltr className="text-2xs text-faint">{region.code}</Ltr>} />
              <DefinitionList
                columns={1}
                items={[
                  { label: 'نسخه مرز', value: <Ltr>{region.boundaryVersionLabel}</Ltr> },
                  { label: 'نسخه پکیج', value: <Ltr>{region.packVersionLabel}</Ltr> },
                  { label: 'مطالعات فعال', value: <span className="num">{formatNumber(region.activeStudies)}</span> },
                ]}
              />
            </Card>
          ))}
        </div>
      )}

      {tab === 'audit' &&
        (auditPerm.allowed ? (
          <Card>
            <CardHeader title="سابقه رویدادها" subtitle="رویدادها فقط‌خواندنی‌اند و حذف نمی‌شوند" />
            <Timeline
              items={audit.map((entry) => ({
                id: entry.id,
                title: `${entry.actor} (${roleLabels[entry.role]}) — ${entry.action}`,
                meta: `${entry.subjectType}: ${entry.subjectTitle} · ${formatRelative(entry.at)}`,
                body: (
                  <>
                    {entry.reason}
                    {(entry.fromVersion || entry.toVersion) && (
                      <span className="mt-0.5 block text-xs">
                        {entry.fromVersion && <>از {entry.fromVersion} </>}
                        {entry.toVersion && <>به {entry.toVersion}</>}
                      </span>
                    )}
                  </>
                ),
                tone: entry.outcome === 'rejected' ? 'danger' : 'success',
              }))}
            />
          </Card>
        ) : (
          <PermissionDeniedState description={auditPerm.reason ?? undefined} />
        ))}

      {tab === 'system' && (
        <div className="space-y-4">
          <Callout tone="neutral" title="محیط نمایشی">
            این نسخه با داده نمونه و لایه شبیه‌سازی‌شده API اجرا می‌شود. با تغییر متغیر محیطی، همان
            فراخوانی‌ها به سرویس پشتیبان واقعی هدایت می‌شوند.
          </Callout>
          <Card>
            <CardHeader title="پیکربندی جاری" />
            <DefinitionList
              columns={2}
              items={[
                { label: 'حالت اتصال', value: <Ltr>{config.apiMode}</Ltr> },
                { label: 'نشانی سرویس', value: <Ltr>{config.apiBaseUrl}</Ltr> },
                { label: 'تأخیر شبیه‌سازی‌شده', value: <span className="num">{formatNumber(config.mockLatencyMs)} میلی‌ثانیه</span> },
                { label: 'زبان پیش‌فرض', value: <Ltr>{config.defaultLocale}</Ltr> },
                { label: 'حالت نمایشی', value: config.demoMode ? 'فعال' : 'غیرفعال' },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
