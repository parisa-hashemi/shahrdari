import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Classification, StudyType } from '@/types/domain';
import { studiesApi } from '@/api/studies';
import { regionsApi } from '@/api/catalog';
import { Card, CardHeader, PageHeader } from '@/components/ui/display';
import { Field, Select, TextInput } from '@/components/ui/inputs';
import { Button } from '@/components/ui/Button';
import { Callout, PermissionDeniedState } from '@/components/ui/feedback';
import { usePermission } from '@/components/workflow';
import { classificationLabels, studyTypeLabels } from '@/utils/dictionary';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function StudyCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const pushToast = useUiStore((s) => s.pushToast);
  const setActiveStudy = useWorkspaceStore((s) => s.setActiveStudy);
  const { allowed, reason } = usePermission('study.create');

  const regions = useQuery({ queryKey: ['regions'], queryFn: regionsApi.list });

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('ST-1405-');
  const [studyType, setStudyType] = useState<StudyType>('local_area');
  const [regionId, setRegionId] = useState('r06');
  const [referenceDate, setReferenceDate] = useState('2026-04-21');
  const [planningHorizon, setPlanningHorizon] = useState('۱۴۰۵ تا ۱۴۱۰');
  const [classification, setClassification] = useState<Classification>('restricted_municipal');
  const [touched, setTouched] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      studiesApi.create({
        title,
        code,
        studyType,
        regionId,
        ownerName: user.displayName,
        referenceDate,
        planningHorizon,
        classification,
      }),
    onSuccess: (study) => {
      queryClient.invalidateQueries({ queryKey: ['studies'] });
      setActiveStudy(study.id);
      pushToast({
        title: 'مطالعه ایجاد شد',
        description: `«${study.title}» در وضعیت پیش‌نویس ثبت شد.`,
        variant: 'success',
      });
      navigate(`/studies/${study.id}`);
    },
    onError: () =>
      pushToast({
        title: 'ثبت مطالعه انجام نشد',
        description: 'ورودی‌ها را بررسی و دوباره تلاش کنید.',
        variant: 'error',
      }),
  });

  if (!allowed) {
    return (
      <div>
        <PageHeader
          title="ایجاد مطالعه جدید"
          breadcrumb={[{ label: 'مطالعات', to: '/studies' }, { label: 'مطالعه جدید' }]}
        />
        <PermissionDeniedState description={reason ?? undefined} />
      </div>
    );
  }

  const titleError = touched && title.trim().length < 5 ? 'عنوان مطالعه حداقل ۵ نویسه باشد.' : undefined;
  const codeError = touched && code.trim().length < 6 ? 'کد مطالعه معتبر نیست.' : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="ایجاد مطالعه جدید"
        description="مطالعه در وضعیت «پیش‌نویس» ایجاد می‌شود. ساختار فصول از قالب مطالعه ساخته می‌شود و فصل صفر (چارچوب و دامنه) به‌صورت خودکار افزوده می‌گردد."
        breadcrumb={[{ label: 'مطالعات', to: '/studies' }, { label: 'مطالعه جدید' }]}
      />

      <Callout tone="neutral" className="mb-4">
        نسخه قالب و نسخه محدوده در زمان ایجاد تثبیت می‌شوند تا نتایج بعدی قابل بازتولید بمانند.
      </Callout>

      <Card>
        <CardHeader title="مشخصات پایه" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="عنوان مطالعه" required error={titleError}>
              <TextInput
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: مطالعه موضعی محور شمالی منطقه ۶"
                invalid={Boolean(titleError)}
              />
            </Field>
          </div>
          <Field label="کد مطالعه" required hint="شناسه یکتا برای ارجاع سازمانی" error={codeError}>
            <TextInput
              value={code}
              ltr
              onChange={(event) => setCode(event.target.value)}
              invalid={Boolean(codeError)}
            />
          </Field>
          <Field label="نوع مطالعه" required>
            <Select
              value={studyType}
              onChange={(event) => setStudyType(event.target.value as StudyType)}
              options={(Object.keys(studyTypeLabels) as StudyType[]).map((key) => ({
                value: key,
                label: studyTypeLabels[key],
              }))}
            />
          </Field>
          <Field label="منطقه" required hint="تنها مناطقی که در دامنه دسترسی شما هستند نمایش داده می‌شوند">
            <Select
              value={regionId}
              onChange={(event) => setRegionId(event.target.value)}
              options={(regions.data ?? []).map((region) => ({
                value: region.id,
                label: region.title,
              }))}
            />
          </Field>
          <Field label="تاریخ مرجع" required hint="مبنای زمانی داده‌ها و قوانین">
            <TextInput
              type="date"
              ltr
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
          </Field>
          <Field label="افق برنامه‌ریزی">
            <TextInput
              value={planningHorizon}
              onChange={(event) => setPlanningHorizon(event.target.value)}
            />
          </Field>
          <Field label="سطح طبقه‌بندی" hint="سطح طبقه‌بندی، دسترسی و امکان صدور خروجی را تعیین می‌کند">
            <Select
              value={classification}
              onChange={(event) => setClassification(event.target.value as Classification)}
              options={(Object.keys(classificationLabels) as Classification[]).map((key) => ({
                value: key,
                label: classificationLabels[key],
              }))}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={create.isPending}
            onClick={() => {
              setTouched(true);
              if (title.trim().length >= 5 && code.trim().length >= 6) create.mutate();
            }}
          >
            ایجاد مطالعه
          </Button>
          <Button variant="ghost" onClick={() => navigate('/studies')}>
            انصراف
          </Button>
        </div>
      </Card>
    </div>
  );
}
