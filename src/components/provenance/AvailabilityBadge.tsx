import type { Availability, MethodSubtype, MissingReason } from '@/types/domain';
import { Badge, StatusBadge, type Tone } from '@/components/ui/display';
import { Tooltip } from '@/components/ui/overlays';
import {
  availabilityLabels,
  methodSubtypeLabels,
  missingReasonLabels,
} from '@/utils/dictionary';

const AVAILABILITY_STYLE: Record<
  Availability,
  { tone: Tone; kind: 'ok' | 'warn' | 'blocked' | 'unknown' | 'locked' }
> = {
  computed: { tone: 'success', kind: 'ok' },
  proxy: { tone: 'warning', kind: 'warn' },
  not_available: { tone: 'muted', kind: 'blocked' },
  not_applicable: { tone: 'muted', kind: 'unknown' },
  suppressed: { tone: 'muted', kind: 'locked' },
};

export function AvailabilityBadge({
  availability,
  missingReason,
}: {
  availability: Availability;
  missingReason?: MissingReason;
}) {
  const style = AVAILABILITY_STYLE[availability];
  const badge = (
    <StatusBadge label={availabilityLabels[availability]} tone={style.tone} kind={style.kind} />
  );
  if (missingReason) {
    return <Tooltip content={missingReasonLabels[missingReason]}>{badge}</Tooltip>;
  }
  return badge;
}

const METHOD_TONE: Record<MethodSubtype, Tone> = {
  deterministic_calculation: 'success',
  rule_evaluation: 'success',
  statistical_estimate: 'warning',
  specialist_model: 'info',
  proxy_estimate: 'warning',
  expert_judgment: 'info',
  external_supplied: 'primary',
};

export function MethodBadge({ subtype }: { subtype: MethodSubtype }) {
  return (
    <Badge tone={METHOD_TONE[subtype]} title="طبقه‌بندی روش تولید نتیجه">
      {methodSubtypeLabels[subtype]}
    </Badge>
  );
}
