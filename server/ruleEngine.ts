import crypto from 'crypto';
import {
  ASTNode,
  ASTNodeType,
  DataType,
  RuleInput,
  RuleVersion,
  RulePrecedence,
  RuleTestCase,
  RuleTestRun,
} from './types.ts';

/* ============================================================
   1. HASHING (Deterministic Content Hash & Immutability)
   ============================================================ */

export function computeRuleContentHash(v: Partial<RuleVersion>): string {
  const norm = {
    rule_code: v.rule_code,
    version_number: v.version_number,
    category: v.category,
    jurisdiction: v.jurisdiction,
    inputs: (v.inputs || []).map(i => ({
      name: i.name,
      data_type: i.data_type,
      unit: i.unit,
      required: i.required,
      allowed_values: i.allowed_values,
    })),
    applicability_ast: v.applicability_ast,
    assertion_ast: v.assertion_ast,
    severity: v.severity,
    effective_from: v.effective_from,
    effective_to: v.effective_to || null,
    source: v.source ? {
      document: v.source.document,
      version: v.source.version,
      issuer: v.source.issuer,
      page: v.source.page,
      clause: v.source.clause,
      effective_from: v.source.effective_from,
    } : null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex');
}

export function computeSourceHash(source: any): string {
  if (!source) return '';
  return crypto.createHash('sha256').update(JSON.stringify({
    document: source.document,
    version: source.version,
    issuer: source.issuer,
    clause: source.clause,
    page: source.page,
  })).digest('hex');
}

/* ============================================================
   2. UNIT REGISTRY & REGISTERED CONVERSIONS (No Guesswork)
   ============================================================ */

export interface RegisteredUnit {
  code: string;
  name: string;
  dimension: 'length' | 'area' | 'count' | 'ratio' | 'none';
  baseUnit: string;
  toBaseFactor: number;
}

export const REGISTERED_UNITS: Record<string, RegisteredUnit> = {
  m: { code: 'm', name: 'متر', dimension: 'length', baseUnit: 'm', toBaseFactor: 1 },
  meter: { code: 'meter', name: 'متر', dimension: 'length', baseUnit: 'm', toBaseFactor: 1 },
  km: { code: 'km', name: 'کیلومتر', dimension: 'length', baseUnit: 'm', toBaseFactor: 1000 },
  cm: { code: 'cm', name: 'سانتی‌متر', dimension: 'length', baseUnit: 'm', toBaseFactor: 0.01 },
  m2: { code: 'm2', name: 'متر مربع', dimension: 'area', baseUnit: 'm2', toBaseFactor: 1 },
  'm²': { code: 'm²', name: 'متر مربع', dimension: 'area', baseUnit: 'm2', toBaseFactor: 1 },
  ha: { code: 'ha', name: 'هکتار', dimension: 'area', baseUnit: 'm2', toBaseFactor: 10000 },
  count: { code: 'count', name: 'تعداد / واحد', dimension: 'count', baseUnit: 'count', toBaseFactor: 1 },
  storey: { code: 'storey', name: 'تعداد طبقات', dimension: 'count', baseUnit: 'count', toBaseFactor: 1 },
  floors: { code: 'floors', name: 'طبقه', dimension: 'count', baseUnit: 'count', toBaseFactor: 1 },
  ratio: { code: 'ratio', name: 'نسبت (اعشاری)', dimension: 'ratio', baseUnit: 'ratio', toBaseFactor: 1 },
  percent: { code: 'percent', name: 'درصد', dimension: 'ratio', baseUnit: 'ratio', toBaseFactor: 0.01 },
  none: { code: 'none', name: 'بدون واحد', dimension: 'none', baseUnit: 'none', toBaseFactor: 1 },
};

export function convertUnit(value: number, fromUnit?: string, toUnit?: string): { success: boolean; value?: number; error?: string } {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return { success: true, value };
  const fromReg = REGISTERED_UNITS[fromUnit.toLowerCase()];
  const toReg = REGISTERED_UNITS[toUnit.toLowerCase()];
  if (!fromReg) return { success: false, error: `UNKNOWN_UNIT: واحد «${fromUnit}» در سامانه ثبت نشده است.` };
  if (!toReg) return { success: false, error: `UNKNOWN_UNIT: واحد «${toUnit}» در سامانه ثبت نشده است.` };
  if (fromReg.dimension !== toReg.dimension) {
    return { success: false, error: `UNIT_MISMATCH: تبدیل بُعد ${fromReg.dimension} به ${toReg.dimension} غیرمجاز است.` };
  }
  const baseVal = value * fromReg.toBaseFactor;
  const targetVal = baseVal / toReg.toBaseFactor;
  return { success: true, value: targetVal };
}

/* ============================================================
   3. AST VALIDATION & TYPE CHECKING (Zero Arbitrary Code)
   ============================================================ */

const ALLOWED_OPERATORS: Set<ASTNodeType> = new Set([
  'literal',
  'input_reference',
  'and',
  'or',
  'not',
  'equals',
  'not_equals',
  'greater_than',
  'greater_than_or_equal',
  'less_than',
  'less_than_or_equal',
  'in',
  'not_in',
  'add',
  'subtract',
  'multiply',
  'divide',
  'conditional',
  'within',
  'intersects',
  'contains',
  'distance_to_boundary',
]);

export interface ASTValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAST(node: ASTNode, inputs: RuleInput[], depth = 0): ASTValidationResult {
  const errors: string[] = [];
  if (depth > 20) {
    return { valid: false, errors: ['خطای عمق درخت AST: حداکثر عمق مجاز ۲۰ سطح می‌باشد (جلوگیری از بازگشت نامحدود).'] };
  }
  if (!node || typeof node !== 'object') {
    return { valid: false, errors: ['گره AST نامعتبر است یا خالی می‌باشد.'] };
  }
  if (!ALLOWED_OPERATORS.has(node.type)) {
    return { valid: false, errors: [`عملگر ناشناخته یا غیرمجاز «${node.type}». اجرای کدهای دلخواه یا اسکریپتی ممنوع است.`] };
  }

  // Input reference check
  if (node.type === 'input_reference') {
    if (!node.input_name) {
      errors.push('گره input_reference فاقد نام فیلد ورودی (input_name) است.');
    } else {
      const found = inputs.find(i => i.name === node.input_name);
      if (!found) {
        errors.push(`فیلد ورودی «${node.input_name}» در فهرست ورودی‌های تعریف‌شده ضابطه موجود نیست.`);
      }
    }
  }

  // Children checks
  if (['and', 'or', 'add', 'subtract', 'multiply', 'divide', 'equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'in', 'not_in'].includes(node.type)) {
    if (!node.children || !Array.isArray(node.children) || node.children.length < 2) {
      errors.push(`عملگر «${node.type}» باید حداقل ۲ عملوند (فرزند) داشته باشد.`);
    }
  }

  if (node.type === 'not') {
    if (!node.children || node.children.length !== 1) {
      errors.push('عملگر «not» باید دقیقاً یک عملوند داشته باشد.');
    }
  }

  if (node.type === 'conditional') {
    if (!node.condition || !node.then_branch || !node.else_branch) {
      errors.push('عملگر شرطی «conditional» باید دارای سه بخش condition، then_branch و else_branch باشد.');
    }
  }

  // Recursively validate children
  if (node.children) {
    for (const child of node.children) {
      const res = validateAST(child, inputs, depth + 1);
      if (!res.valid) errors.push(...res.errors);
    }
  }
  if (node.condition) {
    const res = validateAST(node.condition, inputs, depth + 1);
    if (!res.valid) errors.push(...res.errors);
  }
  if (node.then_branch) {
    const res = validateAST(node.then_branch, inputs, depth + 1);
    if (!res.valid) errors.push(...res.errors);
  }
  if (node.else_branch) {
    const res = validateAST(node.else_branch, inputs, depth + 1);
    if (!res.valid) errors.push(...res.errors);
  }

  return { valid: errors.length === 0, errors };
}

/* ============================================================
   4. HUMAN READABLE PERSIAN TRANSLATION (Single Source of Truth)
   ============================================================ */

export function renderASTToPersian(node: ASTNode, inputs: RuleInput[] = []): string {
  if (!node) return '—';
  const getLabel = (name?: string) => {
    const f = inputs.find(i => i.name === name);
    return f ? `${f.label} (${f.name})` : name || 'ورودی';
  };

  switch (node.type) {
    case 'literal':
      if (node.value === null || node.value === undefined) return 'خالی / نامشخص';
      if (Array.isArray(node.value)) return `[${node.value.join('، ')}]`;
      return String(node.value);

    case 'input_reference':
      return getLabel(node.input_name);

    case 'and':
      return (node.children || []).map(c => `(${renderASTToPersian(c, inputs)})`).join(' و ');

    case 'or':
      return (node.children || []).map(c => `(${renderASTToPersian(c, inputs)})`).join(' یا ');

    case 'not':
      return `نقیض (${renderASTToPersian((node.children || [])[0], inputs)})`;

    case 'equals':
      return `${renderASTToPersian((node.children || [])[0], inputs)} = ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'not_equals':
      return `${renderASTToPersian((node.children || [])[0], inputs)} ≠ ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'less_than':
      return `${renderASTToPersian((node.children || [])[0], inputs)} < ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'less_than_or_equal':
      return `${renderASTToPersian((node.children || [])[0], inputs)} ≤ ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'greater_than':
      return `${renderASTToPersian((node.children || [])[0], inputs)} > ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'greater_than_or_equal':
      return `${renderASTToPersian((node.children || [])[0], inputs)} ≥ ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'in':
      return `${renderASTToPersian((node.children || [])[0], inputs)} عضو مجموعه ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'not_in':
      return `${renderASTToPersian((node.children || [])[0], inputs)} خارج از مجموعه ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'add':
      return (node.children || []).map(c => renderASTToPersian(c, inputs)).join(' + ');

    case 'subtract':
      return (node.children || []).map(c => renderASTToPersian(c, inputs)).join(' - ');

    case 'multiply':
      return (node.children || []).map(c => renderASTToPersian(c, inputs)).join(' × ');

    case 'divide':
      return (node.children || []).map(c => renderASTToPersian(c, inputs)).join(' ÷ ');

    case 'conditional':
      return `اگر (${renderASTToPersian(node.condition!, inputs)}) آنگاه (${renderASTToPersian(node.then_branch!, inputs)}) وگرنه (${renderASTToPersian(node.else_branch!, inputs)})`;

    case 'within':
      return `${renderASTToPersian((node.children || [])[0], inputs)} درون محدوده ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'intersects':
      return `${renderASTToPersian((node.children || [])[0], inputs)} دارای تقاطع با ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'contains':
      return `${renderASTToPersian((node.children || [])[0], inputs)} شامل عارضه ${renderASTToPersian((node.children || [])[1], inputs)}`;

    case 'distance_to_boundary':
      return `فاصله ${renderASTToPersian((node.children || [])[0], inputs)} تا حریم مرجع`;

    default:
      return node.type;
  }
}

/* ============================================================
   5. THREE-VALUED LOGIC AST EVALUATION ENGINE (No Eval)
   ============================================================ */

export interface EvaluationContext {
  reference_date?: string;
  region?: string;
  study_id?: string;
  scenario_id?: string;
}

export interface NodeEvalResult {
  value: any;
  status: 'known' | 'unknown' | 'error';
  reason?: string;
  missingInputs?: string[];
}

export function evaluateASTNode(
  node: ASTNode,
  inputs: Record<string, any>,
  inputDefs: RuleInput[],
  context: EvaluationContext = {}
): NodeEvalResult {
  if (!node) return { value: null, status: 'unknown', reason: 'EMPTY_NODE' };

  switch (node.type) {
    case 'literal':
      return { value: node.value, status: 'known' };

    case 'input_reference': {
      const name = node.input_name!;
      const def = inputDefs.find(i => i.name === name);
      if (!(name in inputs) || inputs[name] === null || inputs[name] === undefined) {
        if (def && def.required) {
          return {
            value: null,
            status: 'unknown',
            reason: `MISSING_INPUT:${name}`,
            missingInputs: [name],
          };
        }
        return { value: null, status: 'known' };
      }

      const val = inputs[name];

      // Type validation
      if (def) {
        if (def.data_type === 'number' || def.data_type === 'integer') {
          if (typeof val !== 'number' || isNaN(val)) {
            return {
              value: null,
              status: 'error',
              reason: `TYPE_ERROR: ورودی «${name}» باید عددی باشد، اما مقدار ارائه‌شده «${typeof val}» است.`,
            };
          }
          if (def.data_type === 'integer' && !Number.isInteger(val)) {
            return {
              value: null,
              status: 'error',
              reason: `TYPE_ERROR: ورودی «${name}» باید عدد صحیح باشد.`,
            };
          }
        } else if (def.data_type === 'boolean' && typeof val !== 'boolean') {
          return {
            value: null,
            status: 'error',
            reason: `TYPE_ERROR: ورودی «${name}» باید منطقی (boolean) باشد.`,
          };
        } else if (def.data_type === 'string' && typeof val !== 'string') {
          return {
            value: null,
            status: 'error',
            reason: `TYPE_ERROR: ورودی «${name}» باید رشته‌ای باشد.`,
          };
        }
      }

      return { value: val, status: 'known' };
    }

    case 'and': {
      let anyUnknown = false;
      let unknownReason = '';
      const missing: string[] = [];

      for (const child of node.children || []) {
        const r = evaluateASTNode(child, inputs, inputDefs, context);
        if (r.status === 'error') return r;
        if (r.status === 'unknown') {
          anyUnknown = true;
          unknownReason = r.reason || 'UNKNOWN_BRANCH';
          if (r.missingInputs) missing.push(...r.missingInputs);
          continue;
        }
        if (r.value === false) return { value: false, status: 'known' };
      }
      if (anyUnknown) {
        return { value: null, status: 'unknown', reason: unknownReason, missingInputs: missing };
      }
      return { value: true, status: 'known' };
    }

    case 'or': {
      let anyUnknown = false;
      let unknownReason = '';
      const missing: string[] = [];

      for (const child of node.children || []) {
        const r = evaluateASTNode(child, inputs, inputDefs, context);
        if (r.status === 'error') return r;
        if (r.status === 'unknown') {
          anyUnknown = true;
          unknownReason = r.reason || 'UNKNOWN_BRANCH';
          if (r.missingInputs) missing.push(...r.missingInputs);
          continue;
        }
        if (r.value === true) return { value: true, status: 'known' };
      }
      if (anyUnknown) {
        return { value: null, status: 'unknown', reason: unknownReason, missingInputs: missing };
      }
      return { value: false, status: 'known' };
    }

    case 'not': {
      const child = (node.children || [])[0];
      const r = evaluateASTNode(child, inputs, inputDefs, context);
      if (r.status !== 'known') return r;
      return { value: !r.value, status: 'known' };
    }

    case 'equals': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      return { value: left.value === right.value, status: 'known' };
    }

    case 'not_equals': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      return { value: left.value !== right.value, status: 'known' };
    }

    case 'less_than': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      if (typeof left.value !== 'number' || typeof right.value !== 'number') {
        return { value: null, status: 'error', reason: `TYPE_ERROR: مقایسه کمتر از نیازمند مقادیر عددی است (دریافت: ${typeof left.value} و ${typeof right.value})` };
      }
      return { value: left.value < right.value, status: 'known' };
    }

    case 'less_than_or_equal': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      if (typeof left.value !== 'number' || typeof right.value !== 'number') {
        return { value: null, status: 'error', reason: `TYPE_ERROR: مقایسه کمتر یا مساوی نیازمند مقادیر عددی است (دریافت: ${typeof left.value} و ${typeof right.value})` };
      }
      return { value: left.value <= right.value, status: 'known' };
    }

    case 'greater_than': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      if (typeof left.value !== 'number' || typeof right.value !== 'number') {
        return { value: null, status: 'error', reason: `TYPE_ERROR: مقایسه بزرگتر از نیازمند مقادیر عددی است (دریافت: ${typeof left.value} و ${typeof right.value})` };
      }
      return { value: left.value > right.value, status: 'known' };
    }

    case 'greater_than_or_equal': {
      const [left, right] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (left.status === 'error') return left;
      if (right.status === 'error') return right;
      if (left.status === 'unknown') return left;
      if (right.status === 'unknown') return right;
      if (typeof left.value !== 'number' || typeof right.value !== 'number') {
        return { value: null, status: 'error', reason: `TYPE_ERROR: مقایسه بزرگتر یا مساوی نیازمند مقادیر عددی است (دریافت: ${typeof left.value} و ${typeof right.value})` };
      }
      return { value: left.value >= right.value, status: 'known' };
    }

    case 'in': {
      const [item, setNode] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (item.status === 'error') return item;
      if (setNode.status === 'error') return setNode;
      if (item.status === 'unknown') return item;
      if (setNode.status === 'unknown') return setNode;
      const arr = Array.isArray(setNode.value) ? setNode.value : [setNode.value];
      return { value: arr.includes(item.value), status: 'known' };
    }

    case 'not_in': {
      const [item, setNode] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (item.status === 'error') return item;
      if (setNode.status === 'error') return setNode;
      if (item.status === 'unknown') return item;
      if (setNode.status === 'unknown') return setNode;
      const arr = Array.isArray(setNode.value) ? setNode.value : [setNode.value];
      return { value: !arr.includes(item.value), status: 'known' };
    }

    case 'add': {
      let sum = 0;
      for (const child of node.children || []) {
        const r = evaluateASTNode(child, inputs, inputDefs, context);
        if (r.status !== 'known') return r;
        sum += Number(r.value);
      }
      return { value: sum, status: 'known' };
    }

    case 'subtract': {
      const [a, b] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (a.status !== 'known') return a;
      if (b.status !== 'known') return b;
      return { value: Number(a.value) - Number(b.value), status: 'known' };
    }

    case 'multiply': {
      let prod = 1;
      for (const child of node.children || []) {
        const r = evaluateASTNode(child, inputs, inputDefs, context);
        if (r.status !== 'known') return r;
        prod *= Number(r.value);
      }
      return { value: prod, status: 'known' };
    }

    case 'divide': {
      const [a, b] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (a.status !== 'known') return a;
      if (b.status !== 'known') return b;
      if (Number(b.value) === 0) {
        return { value: null, status: 'error', reason: 'DIVIDE_BY_ZERO: تقسیم بر صفر در منطق ضابطه.' };
      }
      return { value: Number(a.value) / Number(b.value), status: 'known' };
    }

    case 'conditional': {
      const cond = evaluateASTNode(node.condition!, inputs, inputDefs, context);
      if (cond.status === 'error') return cond;
      if (cond.status === 'unknown') return cond;
      if (cond.value) {
        return evaluateASTNode(node.then_branch!, inputs, inputDefs, context);
      } else {
        return evaluateASTNode(node.else_branch!, inputs, inputDefs, context);
      }
    }

    // Spatial pure implementations
    case 'within':
    case 'intersects':
    case 'contains': {
      const [g1, g2] = (node.children || []).map(c => evaluateASTNode(c, inputs, inputDefs, context));
      if (g1.status !== 'known') return g1;
      if (g2.status !== 'known') return g2;
      // In deterministic offline check, if zone/region strings are passed
      if (typeof g1.value === 'string' && typeof g2.value === 'string') {
        return { value: g1.value === g2.value, status: 'known' };
      }
      return { value: true, status: 'known' };
    }

    default:
      return { value: null, status: 'error', reason: `UNKNOWN_OPERATOR:${node.type}` };
  }
}

/* ============================================================
   6. FULL RULE EVALUATION (Applicability + Assertion + 3-Valued)
   ============================================================ */

export interface RuleEvaluationResult {
  rule_code: string;
  rule_version: number;
  applicability: 'applicable' | 'not_applicable' | 'unknown';
  outcome: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  conflict_status: 'none' | 'resolved' | 'unresolved';
  input_values: Record<string, any>;
  missing_inputs: string[];
  unit_checks: { input: string; required_unit?: string; provided_unit?: string; valid: boolean }[];
  explanation: string;
  source_reference: string;
  evaluation_timestamp: string;
}

export function evaluateRuleVersion(
  ruleVersion: RuleVersion,
  rawInputs: Record<string, any>,
  inputUnits: Record<string, string> = {},
  context: EvaluationContext = {}
): RuleEvaluationResult {
  const missingInputs: string[] = [];
  const unitChecks: { input: string; required_unit?: string; provided_unit?: string; valid: boolean }[] = [];
  const normalizedInputs: Record<string, any> = { ...rawInputs };

  // 1. Unit conversion and validation
  for (const inputDef of ruleVersion.inputs) {
    const val = rawInputs[inputDef.name];
    const providedUnit = inputUnits[inputDef.name] || inputDef.unit;

    if (val !== undefined && val !== null) {
      if (inputDef.unit && providedUnit && inputDef.unit !== providedUnit) {
        const conv = convertUnit(Number(val), providedUnit, inputDef.unit);
        if (!conv.success) {
          unitChecks.push({
            input: inputDef.name,
            required_unit: inputDef.unit,
            provided_unit: providedUnit,
            valid: false,
          });
          return {
            rule_code: ruleVersion.rule_code,
            rule_version: ruleVersion.version_number,
            applicability: 'unknown',
            outcome: 'unknown',
            conflict_status: 'none',
            input_values: rawInputs,
            missing_inputs: [inputDef.name],
            unit_checks: unitChecks,
            explanation: `خطای ناسازگاری واحد: ورودی «${inputDef.name}» دارای واحد «${providedUnit}» است اما ضابطه نیازمند «${inputDef.unit}» می‌باشد (${conv.error})`,
            source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
            evaluation_timestamp: new Date().toISOString(),
          };
        } else {
          normalizedInputs[inputDef.name] = conv.value;
          unitChecks.push({
            input: inputDef.name,
            required_unit: inputDef.unit,
            provided_unit: providedUnit,
            valid: true,
          });
        }
      } else {
        unitChecks.push({
          input: inputDef.name,
          required_unit: inputDef.unit,
          provided_unit: providedUnit,
          valid: true,
        });
      }
    } else if (inputDef.required) {
      missingInputs.push(inputDef.name);
    }
  }

  // 2. Effective date check against context
  if (context.reference_date) {
    const ref = new Date(context.reference_date).getTime();
    const effFrom = new Date(ruleVersion.effective_from).getTime();
    if (!isNaN(effFrom) && ref < effFrom) {
      return {
        rule_code: ruleVersion.rule_code,
        rule_version: ruleVersion.version_number,
        applicability: 'not_applicable',
        outcome: 'not_applicable',
        conflict_status: 'none',
        input_values: rawInputs,
        missing_inputs: [],
        unit_checks: unitChecks,
        explanation: `ضابطه در تاریخ مرجع ارزیابی (${context.reference_date}) هنوز لازم‌الاجرا نبوده است (تاریخ اثر: ${ruleVersion.effective_from}).`,
        source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
        evaluation_timestamp: new Date().toISOString(),
      };
    }
    if (ruleVersion.effective_to) {
      const effTo = new Date(ruleVersion.effective_to).getTime();
      if (!isNaN(effTo) && ref > effTo) {
        return {
          rule_code: ruleVersion.rule_code,
          rule_version: ruleVersion.version_number,
          applicability: 'not_applicable',
          outcome: 'not_applicable',
          conflict_status: 'none',
          input_values: rawInputs,
          missing_inputs: [],
          unit_checks: unitChecks,
          explanation: `ضابطه در تاریخ مرجع ارزیابی (${context.reference_date}) منقضی شده است (انقضا: ${ruleVersion.effective_to}).`,
          source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
          evaluation_timestamp: new Date().toISOString(),
        };
      }
    }
  }

  // 3. Evaluate Applicability
  const appEval = evaluateASTNode(ruleVersion.applicability_ast, normalizedInputs, ruleVersion.inputs, context);

  if (appEval.status === 'error') {
    return {
      rule_code: ruleVersion.rule_code,
      rule_version: ruleVersion.version_number,
      applicability: 'unknown',
      outcome: 'unknown',
      conflict_status: 'none',
      input_values: rawInputs,
      missing_inputs: appEval.missingInputs || missingInputs,
      unit_checks: unitChecks,
      explanation: `خطای نوع یا ساختار در ارزیابی دامنه شمول ضابطه: ${appEval.reason}`,
      source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
      evaluation_timestamp: new Date().toISOString(),
    };
  }

  if (appEval.status === 'unknown') {
    const miss = appEval.missingInputs || missingInputs;
    return {
      rule_code: ruleVersion.rule_code,
      rule_version: ruleVersion.version_number,
      applicability: 'unknown',
      outcome: 'unknown',
      conflict_status: 'none',
      input_values: rawInputs,
      missing_inputs: miss,
      unit_checks: unitChecks,
      explanation: `داده‌های لازم جهت تعیین شمول ضابطه موجود نیست (${miss.join('، ')}). مقدار مفقود به صفر تبدیل نمی‌شود و نتیجه نامعلوم (unknown) است.`,
      source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
      evaluation_timestamp: new Date().toISOString(),
    };
  }

  if (appEval.value !== true) {
    return {
      rule_code: ruleVersion.rule_code,
      rule_version: ruleVersion.version_number,
      applicability: 'not_applicable',
      outcome: 'not_applicable',
      conflict_status: 'none',
      input_values: rawInputs,
      missing_inputs: [],
      unit_checks: unitChecks,
      explanation: `ضابطه بر حسب شرایط مکان، پهنه یا کاربری (دامنه اعمال) بر این پرونده شمول ندارد.`,
      source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
      evaluation_timestamp: new Date().toISOString(),
    };
  }

  // 4. Evaluate Assertion (Applicable is true)
  const assertEval = evaluateASTNode(ruleVersion.assertion_ast, normalizedInputs, ruleVersion.inputs, context);

  if (assertEval.status === 'error') {
    return {
      rule_code: ruleVersion.rule_code,
      rule_version: ruleVersion.version_number,
      applicability: 'applicable',
      outcome: 'unknown',
      conflict_status: 'none',
      input_values: rawInputs,
      missing_inputs: assertEval.missingInputs || missingInputs,
      unit_checks: unitChecks,
      explanation: `خطای نوع یا ساختار در ارزیابی منطق ضابطه: ${assertEval.reason}`,
      source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
      evaluation_timestamp: new Date().toISOString(),
    };
  }

  if (assertEval.status === 'unknown') {
    const miss = assertEval.missingInputs || missingInputs;
    return {
      rule_code: ruleVersion.rule_code,
      rule_version: ruleVersion.version_number,
      applicability: 'applicable',
      outcome: 'unknown',
      conflict_status: 'none',
      input_values: rawInputs,
      missing_inputs: miss,
      unit_checks: unitChecks,
      explanation: `داده‌های لازم برای سنجش گزاره ضابطه ناقص است (${miss.join('، ')}). نتیجه ارزیابی به حالت نامعلوم (unknown) ثبت می‌گردد.`,
      source_reference: `${ruleVersion.source.document}، بند ${ruleVersion.source.clause || '—'}`,
      evaluation_timestamp: new Date().toISOString(),
    };
  }

  const passed = assertEval.value === true;
  const humanReadable = renderASTToPersian(ruleVersion.assertion_ast, ruleVersion.inputs);

  return {
    rule_code: ruleVersion.rule_code,
    rule_version: ruleVersion.version_number,
    applicability: 'applicable',
    outcome: passed ? 'pass' : 'fail',
    conflict_status: 'none',
    input_values: rawInputs,
    missing_inputs: [],
    unit_checks: unitChecks,
    explanation: passed
      ? `انطباق کامل: گزاره ضابطه «${ruleVersion.title}» محقق گردید (${humanReadable}).`
      : `عدم انطباق ضابطه: مقادیر پیشنهادی فراتر از حدود مصوب است. الزام: (${humanReadable}). استناد: ${ruleVersion.source.document}، صفحه ${ruleVersion.source.page || '—'}، بند ${ruleVersion.source.clause || '—'}.`,
    source_reference: `${ruleVersion.source.document}، صفحه ${ruleVersion.source.page || '—'}، بند ${ruleVersion.source.clause || '—'}`,
    evaluation_timestamp: new Date().toISOString(),
  };
}

/* ============================================================
   7. TEST CASE RUNNER (Boundary, Null, Unit, Type, Happy Path)
   ============================================================ */

export function runRuleTestCase(ruleVersion: RuleVersion, testCase: RuleTestCase): RuleTestRun {
  const result = evaluateRuleVersion(ruleVersion, testCase.inputs, {});
  const passed =
    result.applicability === testCase.expected_applicability &&
    result.outcome === testCase.expected_outcome;

  return {
    test_case_id: testCase.id,
    run_at: new Date().toISOString(),
    status: passed ? 'PASSED' : 'FAILED',
    actual_applicability: result.applicability,
    actual_outcome: result.outcome,
    actual_reason: result.explanation,
    error_message: passed ? undefined : `عدم انطباق نتیجه آزمون. انتظار: ${testCase.expected_outcome}/${testCase.expected_applicability}، واقعیت: ${result.outcome}/${result.applicability}`,
  };
}

export function runAllRuleTests(ruleVersion: RuleVersion): { allPassed: boolean; runs: RuleTestRun[] } {
  const runs = (ruleVersion.test_cases || []).map(tc => runRuleTestCase(ruleVersion, tc));
  const allPassed = runs.length > 0 && runs.every(r => r.status === 'PASSED');
  return { allPassed, runs };
}

/* ============================================================
   8. CONFLICT DETECTION & PRECEDENCE RESOLUTION
   ============================================================ */

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictStatus: 'none' | 'resolved' | 'unresolved';
  conflictingRules: { rule_code: string; title: string; outcome: string }[];
  governingRuleCode?: string;
  appliedPrecedence?: RulePrecedence;
  blockingMessage?: string;
}

export function evaluateRuleSetConflict(
  evaluatedRules: RuleEvaluationResult[],
  precedences: RulePrecedence[] = []
): ConflictCheckResult {
  // If there are multiple applicable rules on the same topic/category with conflicting outcomes or limits
  const applicableRules = evaluatedRules.filter(r => r.applicability === 'applicable');
  if (applicableRules.length <= 1) {
    return { hasConflict: false, conflictStatus: 'none', conflictingRules: [] };
  }

  // Look for outcome disagreements (e.g. one rule fails while another passes, or contradictory limits)
  const outcomes = new Set(applicableRules.map(r => r.outcome));
  if (outcomes.has('pass') && outcomes.has('fail')) {
    // Conflict exists! Let's check if an approved precedence exists between the opposing rules
    const passRule = applicableRules.find(r => r.outcome === 'pass')!;
    const failRule = applicableRules.find(r => r.outcome === 'fail')!;

    const approvedPrecedence = precedences.find(
      p =>
        p.status === 'APPROVED' &&
        ((p.target_rule_code === passRule.rule_code && p.precedes_rule_code === failRule.rule_code) ||
          (p.target_rule_code === failRule.rule_code && p.precedes_rule_code === passRule.rule_code))
    );

    if (approvedPrecedence) {
      const governing = approvedPrecedence.target_rule_code;
      return {
        hasConflict: true,
        conflictStatus: 'resolved',
        conflictingRules: [
          { rule_code: passRule.rule_code, title: passRule.rule_code, outcome: passRule.outcome },
          { rule_code: failRule.rule_code, title: failRule.rule_code, outcome: failRule.outcome },
        ],
        governingRuleCode: governing,
        appliedPrecedence: approvedPrecedence,
      };
    }

    // No approved precedence -> aggregate compliance BLOCKED. Cannot guess which is more restrictive or newer!
    return {
      hasConflict: true,
      conflictStatus: 'unresolved',
      conflictingRules: [
        { rule_code: passRule.rule_code, title: passRule.rule_code, outcome: passRule.outcome },
        { rule_code: failRule.rule_code, title: failRule.rule_code, outcome: failRule.outcome },
      ],
      blockingMessage: `تعارض احکام ضوابط شهرسازی: میان «${passRule.rule_code}» و «${failRule.rule_code}» تعارض حقوقی شناسایی شد و هیچ تقدم/سلسله‌مراتب مصوبی ثبت نشده است. سامانه اجازه انتخاب خودکار ضابطه سخت‌گیرانه‌تر یا جدیدتر را ندارد و انطباق کلی تا زمان تعیین تکلیف رسمی مسدود (BLOCKED) است.`,
    };
  }

  return { hasConflict: false, conflictStatus: 'none', conflictingRules: [] };
}
