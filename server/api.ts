import express, { Router, Request, Response } from 'express';
import { store } from './store.ts';

export const apiRouter = Router();

apiRouter.use(express.json());

// 1. Auth & OTP
apiRouter.post('/auth/check-phone', (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'شماره تلفن الزامی است' });
  }
  const cleanPhone = String(phone).trim().replace(/[^\d+]/g, '');
  const isRegistered = store.isPhoneRegistered(cleanPhone);
  const profile = store.getProfile(cleanPhone);
  return res.json({
    registered: isRegistered,
    phone: cleanPhone,
    user: profile ? {
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      org: profile.university_name,
      title: profile.profession_type,
    } : null,
  });
});

apiRouter.post('/auth/register-scientific', (req: Request, res: Response) => {
  const {
    phone,
    first_name,
    last_name,
    national_id,
    email,
    university_id,
    university_name,
    faculty_group,
    profession_type,
    field_of_study,
    academic_degree,
    student_id_or_license,
    experience_years,
    specialties,
  } = req.body;

  if (!phone || !first_name || !last_name || !field_of_study) {
    return res.status(400).json({ error: 'تکمیل شماره تلفن، نام، نام خانوادگی و رشته تخصصی الزامی است.' });
  }

  const cleanPhone = String(phone).trim().replace(/[^\d+]/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'شماره تلفن وارد شده نامعتبر است.' });
  }

  const result = store.registerScientificUser({
    phone: cleanPhone,
    first_name,
    last_name,
    national_id,
    email,
    university_id: university_id || 'UT',
    university_name: university_name || 'دانشگاه تهران',
    faculty_group,
    profession_type: profession_type || 'پژوهشگر',
    field_of_study,
    academic_degree: academic_degree || 'کارشناسی ارشد',
    student_id_or_license,
    experience_years: Number(experience_years) || 1,
    specialties: Array.isArray(specialties) ? specialties : ['برنامه‌ریزی شهری'],
  });

  return res.json({
    success: true,
    message: result.message,
    user: result.user,
    profile: result.profile,
    code: '123456',
  });
});

apiRouter.post('/auth/request-otp', (req: Request, res: Response) => {
  const { phone, purpose } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'شماره تلفن الزامی است' });
  }
  const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'شماره تلفن نامعتبر است' });
  }

  const result = store.requestOtp(cleanPhone, purpose || 'login');
  if (!result.success) {
    return res.status(403).json({
      success: false,
      notRegistered: true,
      error: result.error || 'این شماره تلفن هنوز ثبت‌نام نشده است. لطفاً ابتدا ثبت‌نام کنید.',
    });
  }

  return res.json({
    success: true,
    message: 'کد تأیید ۶ رقمی به شماره همراه شما ارسال شد.',
    code: result.code, // Returned for dev preview convenience
    isRegistered: result.isRegistered,
  });
});

apiRouter.post('/auth/verify-otp', (req: Request, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'شماره تلفن و کد تأیید الزامی هستند' });
  }
  const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
  const cleanCode = String(code).trim();

  const result = store.verifyOtp(cleanPhone, cleanCode);
  if (!result.success) {
    return res.status(400).json({ error: result.message || 'کد تأیید نامعتبر است' });
  }

  return res.json({
    success: true,
    user: result.user,
    profile: result.profile,
    token: `tuip-sec-token-${cleanPhone}-${Date.now()}`,
  });
});

// 2. Profile Management
apiRouter.get('/scientific/profile', (req: Request, res: Response) => {
  const phone = (req.query.phone as string) || (req.headers['x-user-phone'] as string);
  if (!phone) {
    return res.status(400).json({ error: 'شناسه کاربر یا شماره تلفن لازم است' });
  }
  const profile = store.getProfile(phone);
  return res.json({ profile: profile || null });
});

apiRouter.put('/scientific/profile', (req: Request, res: Response) => {
  const { phone, ...updates } = req.body;
  const userPhone = phone || (req.headers['x-user-phone'] as string);
  if (!userPhone) {
    return res.status(400).json({ error: 'شماره تلفن لازم است' });
  }
  const updated = store.updateProfile(userPhone, updates);
  return res.json({ success: true, profile: updated });
});

// 3. Vocabularies & Areas
apiRouter.get('/scientific/universities', (_req: Request, res: Response) => {
  return res.json({ universities: store.getUniversities() });
});

apiRouter.get('/scientific/areas', (_req: Request, res: Response) => {
  return res.json({ areas: store.getAreas() });
});

apiRouter.get('/scientific/stats', (_req: Request, res: Response) => {
  return res.json(store.getStats());
});

// 4. Proposals (Scientific Contributor)
apiRouter.get('/proposals', (req: Request, res: Response) => {
  const list = store.getAnalystProposals({});
  return res.json({ proposals: list, count: list.length });
});

apiRouter.post('/proposals', (req: Request, res: Response) => {
  const phone = (req.headers['x-user-phone'] as string) || req.body.phone;
  if (!phone) {
    return res.status(400).json({ error: 'کاربر احراز هویت نشده است' });
  }
  if (!req.body.title || req.body.title.trim().length < 3) {
    return res.status(400).json({ error: 'عنوان پیشنهاد الزامی است و باید حداقل ۳ حرف باشد' });
  }

  const created = store.createProposal(phone, req.body);
  return res.json({ success: true, proposal: created });
});

apiRouter.get('/proposals/my', (req: Request, res: Response) => {
  const phone = (req.headers['x-user-phone'] as string) || (req.query.phone as string) || (req.query.name as string);
  if (!phone) {
    return res.status(400).json({ error: 'شناسه کاربر ارسال نشده است' });
  }
  const list = store.getMyProposals(phone);
  return res.json({ proposals: list });
});

apiRouter.get('/proposals/:id', (req: Request, res: Response) => {
  const proposal = store.getProposal(req.params.id);
  if (!proposal) {
    return res.status(404).json({ error: 'پیشنهاد مورد نظر یافت نشد' });
  }
  return res.json({ proposal });
});

apiRouter.put('/proposals/:id', (req: Request, res: Response) => {
  const actorName = (req.headers['x-user-name'] as string) || 'نهاد علمی';
  const actorRole = (req.headers['x-user-role'] as string) || 'scientific';
  const updated = store.updateProposal(req.params.id, req.body, actorName, actorRole);
  if (!updated) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
  }
  return res.json({ success: true, proposal: updated });
});

apiRouter.post('/proposals/:id/submit', (req: Request, res: Response) => {
  const actorName = (req.headers['x-user-name'] as string) || 'نهاد علمی';
  const updated = store.updateProposal(
    req.params.id,
    { status: 'SUBMITTED' },
    actorName,
    'نهاد علمی / ارائه‌دهنده پیشنهاد'
  );
  if (!updated) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
  }
  return res.json({ success: true, proposal: updated });
});

apiRouter.post('/proposals/:id/respond-info', (req: Request, res: Response) => {
  const { requestId, response, attachments } = req.body;
  if (!requestId || !response) {
    return res.status(400).json({ error: 'شناسه درخواست و متن پاسخ الزامی است' });
  }
  const updated = store.answerReviewInfo(req.params.id, requestId, response, attachments);
  if (!updated) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
  }
  return res.json({ success: true, proposal: updated });
});

// 5. Analyst Queue & Decision Integration
apiRouter.get('/analyst/proposals', (req: Request, res: Response) => {
  const { region, district, topic, type, status, university, profession, search, analyst } = req.query as {
    [key: string]: string;
  };
  const list = store.getAnalystProposals({
    region,
    district,
    topic,
    type,
    status,
    university,
    profession,
    search,
    analyst: analyst || (req.headers['x-user-role'] === 'analyst' ? (req.headers['x-user-name'] as string) : undefined),
  });
  return res.json({ proposals: list, count: list.length });
});

apiRouter.get('/analyst/proposals/:id', (req: Request, res: Response) => {
  const proposal = store.getProposal(req.params.id);
  if (!proposal) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
  }
  return res.json({ proposal });
});

apiRouter.post('/analyst/proposals/:id/request-info', (req: Request, res: Response) => {
  const analystId = (req.headers['x-user-id'] as string) || 'analyst-user';
  const analystName = (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی (تحلیلگر شهری)';
  const { question } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'متن درخواست استعلام و تکمیل اطلاعات الزامی است' });
  }

  const updated = store.requestReviewInfo(req.params.id, analystId, analystName, question.trim());
  if (!updated) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
  }
  return res.json({ success: true, proposal: updated });
});

apiRouter.post('/analyst/proposals/:id/create-scenario', (req: Request, res: Response) => {
  const analystId = (req.headers['x-user-id'] as string) || 'analyst-user';
  const analystName = (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی (تحلیلگر شهری)';
  const studyId = req.body.study_id || 'ST-1405-014';

  const result = store.createScenarioFromProposal(req.params.id, analystId, analystName, studyId);
  if (!result) {
    return res.status(404).json({ error: 'پیشنهاد یافت نشد یا امکان ایجاد سناریو وجود ندارد' });
  }

  return res.json({
    success: true,
    message: 'سناریوی جدید بر پایه پیشنهاد علمی ایجاد شد و وارد چرخه تحلیل شد.',
    scenario: result.scenario,
    proposal: result.proposal,
  });
});

apiRouter.get('/scenarios', (_req: Request, res: Response) => {
  return res.json({ scenarios: store.getScenarios() });
});

// 6. Study Cases & Blocker Resolution
apiRouter.get('/study-cases', (req: Request, res: Response) => {
  const { analyst, status } = req.query as { analyst?: string; status?: string };
  const cases = store.getStudyCases({ analyst, status });
  return res.json({ studyCases: cases, count: cases.length });
});

apiRouter.get('/study-cases/:id', (req: Request, res: Response) => {
  const sc = store.getStudyCase(req.params.id);
  if (!sc) {
    return res.status(404).json({ error: 'پرونده مطالعه یافت نشد' });
  }
  const requirements = store.getDataRequirements(sc.id);
  const blockers = store.getBlockers(sc.id);
  const requests = store.getDataRequests({ studyCaseId: sc.id });
  return res.json({ studyCase: sc, requirements, blockers, requests });
});

apiRouter.get('/study-cases/by-proposal/:proposalId', (req: Request, res: Response) => {
  let sc = store.getStudyCaseByProposal(req.params.proposalId);
  if (!sc) {
    // If not exists yet, create it from the proposal automatically
    const analystName = (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی';
    try {
      sc = store.createStudyCaseFromProposal(req.params.proposalId, analystName);
    } catch {
      return res.status(404).json({ error: 'پیشنهاد یافت نشد' });
    }
  }
  const requirements = store.getDataRequirements(sc.id);
  const blockers = store.getBlockers(sc.id);
  const requests = store.getDataRequests({ studyCaseId: sc.id });
  return res.json({ studyCase: sc, requirements, blockers, requests });
});

apiRouter.post('/study-cases/from-proposal', (req: Request, res: Response) => {
  const { proposal_id } = req.body;
  if (!proposal_id) {
    return res.status(400).json({ error: 'شناسه پیشنهاد الزامی است' });
  }
  const analystName = (req.headers['x-user-name'] as string) || req.body.analyst_name || 'مهندس زهرا کاظمی';
  try {
    const sc = store.createStudyCaseFromProposal(proposal_id, analystName);
    const requirements = store.getDataRequirements(sc.id);
    const blockers = store.getBlockers(sc.id);
    return res.json({ success: true, studyCase: sc, requirements, blockers });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ایجاد پرونده مطالعه' });
  }
});

apiRouter.get('/study-cases/:id/requirements', (req: Request, res: Response) => {
  const requirements = store.getDataRequirements(req.params.id);
  return res.json({ requirements });
});

apiRouter.get('/study-cases/:id/blockers', (req: Request, res: Response) => {
  const blockers = store.getBlockers(req.params.id);
  return res.json({ blockers, count: blockers.length });
});

apiRouter.post('/study-cases/:id/requests', (req: Request, res: Response) => {
  const { requirement_id, reason, priority } = req.body;
  if (!requirement_id) {
    return res.status(400).json({ error: 'شناسه نیازمندی داده الزامی است' });
  }
  const requestedBy = (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی (تحلیلگر شهری)';
  try {
    const dataReq = store.createDataRequest(req.params.id, requirement_id, requestedBy, reason, priority);
    const updatedCase = store.getStudyCase(req.params.id);
    return res.json({ success: true, request: dataReq, studyCase: updatedCase });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ثبت درخواست داده' });
  }
});

apiRouter.get('/data-requests', (req: Request, res: Response) => {
  const { studyCaseId, status } = req.query as { studyCaseId?: string; status?: string };
  const requests = store.getDataRequests({ studyCaseId, status });
  return res.json({ requests, count: requests.length });
});

apiRouter.get('/data-requests/:id', (req: Request, res: Response) => {
  const dataReq = store.getDataRequest(req.params.id);
  if (!dataReq) {
    return res.status(404).json({ error: 'درخواست داده یافت نشد' });
  }
  return res.json({ request: dataReq });
});

apiRouter.post('/data-requests/:id/fulfill', (req: Request, res: Response) => {
  const { dataset_code, dataset_version, note } = req.body;
  if (!dataset_code || dataset_version === undefined) {
    return res.status(400).json({ error: 'شناسه دیتاست و شماره نسخه الزامی هستند' });
  }
  const fulfilledBy = (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)';
  try {
    const result = store.fulfillDataRequest(
      req.params.id,
      dataset_code,
      Number(dataset_version),
      fulfilledBy,
      note
    );
    return res.json({
      success: true,
      message: 'داده با موفقیت تأمین شد و به پرونده متصل گردید.',
      request: result.request,
      studyCase: result.studyCase,
      unblocked: result.studyCase.status === 'READY_FOR_NEXT_STEP',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در تأمین داده' });
  }
});

apiRouter.post('/data-requests/:id/start', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const result = store.startDataRequest(req.params.id, actor);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در شروع بررسی درخواست' });
  }
});

apiRouter.post('/data-requests/:id/reject', (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'علت رد درخواست الزامی است' });
  }
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const result = store.rejectDataRequest(req.params.id, reason, actor);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در رد درخواست' });
  }
});

apiRouter.post('/study-cases/:id/requirements/:reqId/limitation', (req: Request, res: Response) => {
  const { limitation_note } = req.body;
  if (!limitation_note || !String(limitation_note).trim()) {
    return res.status(400).json({ error: 'شرح محدودیت داده الزامی است' });
  }
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی (تحلیلگر شهری)',
    role: (req.headers['x-user-role'] as string) || 'analyst',
  };
  try {
    const result = store.recordDataRequirementLimitation(req.params.id, req.params.reqId, limitation_note, actor);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ثبت محدودیت داده' });
  }
});

apiRouter.post('/study-cases/:id/recheck', (req: Request, res: Response) => {
  try {
    const updatedCase = store.recalculateStudyCaseBlockingState(req.params.id);
    const blockers = store.getBlockers(req.params.id);
    return res.json({
      success: true,
      studyCase: updatedCase,
      blockers,
      isBlocked: updatedCase.status === 'BLOCKED',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ارزیابی مجدد وابستگی‌ها' });
  }
});

/* ------------------------------------------------------------
   DATA STEWARD API ROUTES
   ------------------------------------------------------------ */

apiRouter.get('/data-steward/kpis', (req: Request, res: Response) => {
  try {
    const kpis = store.getDataStewardKPIs();
    return res.json({ success: true, kpis });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/data-steward/queues', (req: Request, res: Response) => {
  try {
    const queues = store.getDataStewardQueues();
    return res.json({ success: true, queues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/data-steward/audit', (req: Request, res: Response) => {
  try {
    const entityId = req.query.entityId as string | undefined;
    const audits = store.getDatasetAuditLog(entityId);
    return res.json({ success: true, audits, count: audits.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/datasets/search', (req: Request, res: Response) => {
  try {
    const results = store.searchCatalog(req.query as any);
    return res.json({ success: true, results, count: results.length });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/datasets', (req: Request, res: Response) => {
  try {
    const filters = req.query as { status?: string; region?: string; search?: string };
    const datasets = store.getDatasets(filters);
    return res.json({ success: true, datasets, count: datasets.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/datasets', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const dataset = store.createDataset(req.body, actor);
    return res.json({ success: true, dataset });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/datasets/:code', (req: Request, res: Response) => {
  const ds = store.getDataset(req.params.code);
  if (!ds) {
    return res.status(404).json({ error: 'مجموعه داده یافت نشد' });
  }
  const versions = store.getDatasetVersions(req.params.code);
  return res.json({ success: true, dataset: ds, versions });
});

apiRouter.get('/datasets/:code/versions', (req: Request, res: Response) => {
  const versions = store.getDatasetVersions(req.params.code);
  return res.json({ success: true, versions, count: versions.length });
});

apiRouter.get('/datasets/:code/versions/:version', (req: Request, res: Response) => {
  const ver = store.getDatasetVersion(req.params.code, Number(req.params.version));
  if (!ver) {
    return res.status(404).json({ error: 'نسخه داده یافت نشد' });
  }
  return res.json({ success: true, version: ver });
});

apiRouter.post('/datasets/:code/versions/candidate', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.createCandidateVersion(req.params.code, req.body, actor);
    return res.json({ success: true, version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/profile', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.profileDatasetVersion(req.params.code, Number(req.params.version), req.body, actor);
    return res.json({ success: true, version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/map', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.mapDatasetVersion(req.params.code, Number(req.params.version), req.body.mappings || [], actor);
    return res.json({ success: true, version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/validate', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const result = store.validateDatasetVersion(req.params.code, Number(req.params.version), actor, req.body);
    return res.json({
      success: true,
      status: result.version.status,
      version: result.version,
      checks: result.checks,
      issues: result.issues,
      quality: result.quality,
      reconciliation: result.reconciliation,
      blockingErrorsCount: result.blockingErrorsCount,
      warningsCount: result.warningsCount,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/quarantine', (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'دلیل قرنطینه‌سازی داده اجباری است' });
  }
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.quarantineDatasetVersion(req.params.code, Number(req.params.version), reason, actor);
    return res.json({ success: true, message: 'نسخه داده با ثبت دلیل به قرنطینه منتقل شد', version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/request-correction', (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'شرح اصلاحات موردنیاز الزامی است' });
  }
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.requestVersionCorrection(req.params.code, Number(req.params.version), reason, actor);
    return res.json({ success: true, message: 'درخواست اصلاح به ارائه‌دهنده ارسال شد', version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/approve', (req: Request, res: Response) => {
  const { approved_by, notes } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'دکتر علیرضا برومند (مدیر کل ترابری شهری)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const version = store.approveSemanticReview(req.params.code, Number(req.params.version), approved_by || actor.name, notes, actor);
    return res.json({ success: true, message: 'تأیید معنایی با موفقیت ثبت شد', version });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/datasets/:code/versions/:version/publish', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس مریم فراهانی (متولی داده)',
    role: (req.headers['x-user-role'] as string) || 'steward',
  };
  try {
    const result = store.publishDatasetVersion(req.params.code, Number(req.params.version), actor.name, actor);
    return res.json({
      success: true,
      message: `نسخه ${req.params.code} v${req.params.version} با موفقیت منتشر گردید.`,
      version: result.version,
      dataset: result.dataset,
      supersededVersion: result.supersededVersion,
      noticesCount: result.notices.length,
      notices: result.notices,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/datasets/:code/compare', (req: Request, res: Response) => {
  const vFrom = Number(req.query.from);
  const vTo = Number(req.query.to);
  if (!vFrom || !vTo) {
    return res.status(400).json({ error: 'مشخص کردن شماره نسخه‌های مبدأ و مقصد (from, to) الزامی است' });
  }
  try {
    const comparison = store.compareDatasetVersions(req.params.code, vFrom, vTo);
    return res.json({ success: true, comparison });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/* ============================================================
   RULE STEWARD (قواعد و ضوابط شهرسازی) API ENDPOINTS
   ============================================================ */

// 1. KPIs, Queues & Audit
apiRouter.get('/rule-steward/kpis', (_req: Request, res: Response) => {
  try {
    const kpis = store.getRuleStewardKPIs();
    return res.json({ success: true, kpis });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rule-steward/queues', (_req: Request, res: Response) => {
  try {
    const queues = store.getRuleStewardQueues();
    return res.json({ success: true, queues });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rule-steward/audits', (req: Request, res: Response) => {
  try {
    const entityId = req.query.entity_id as string | undefined;
    const audits = store.getRuleAudits(entityId);
    return res.json({ success: true, audits });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Rules Catalog & CRUD
apiRouter.get('/rules', (req: Request, res: Response) => {
  try {
    const filters = {
      category: req.query.category as string,
      jurisdiction: req.query.jurisdiction as string,
      status: req.query.status as string,
      owner: req.query.owner as string,
      severity: req.query.severity as string,
      rule_pack: req.query.rule_pack as string,
      search: req.query.search as string,
      study_id: req.query.study_id as string,
    };
    const rules = store.getRules(filters);
    return res.json({ success: true, rules, count: rules.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rules/:code', (req: Request, res: Response) => {
  try {
    const details = store.getRule(req.params.code);
    if (!details) {
      return res.status(404).json({ error: `ضابطه با کد ${req.params.code} یافت نشد.` });
    }
    return res.json({ success: true, ...details });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/rules', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.createRule(req.body, actor);
    return res.status(201).json({
      success: true,
      message: `ضابطه «${result.rule.title}» با موفقیت در وضعیت پیش‌نویس ثبت گردید.`,
      rule: result.rule,
      version: result.version,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 3. Rule Versions Lifecycle
apiRouter.get('/rules/:code/versions', (req: Request, res: Response) => {
  try {
    const versions = store.getRuleVersions(req.params.code);
    return res.json({ success: true, versions, count: versions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rules/:code/versions/:version', (req: Request, res: Response) => {
  try {
    const version = store.getRuleVersion(req.params.code, Number(req.params.version));
    if (!version) {
      return res.status(404).json({ error: `نسخه ${req.params.version} ضابطه ${req.params.code} یافت نشد.` });
    }
    return res.json({ success: true, version });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const newVersion = store.createRuleVersion(req.params.code, req.body, actor);
    return res.status(201).json({
      success: true,
      message: `نسخه جدید v${newVersion.version_number} برای ضابطه ${req.params.code} با موفقیت ایجاد گردید.`,
      version: newVersion,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/rules/:code/versions/:version/source', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const updated = store.updateRuleSource(req.params.code, Number(req.params.version), req.body, actor);
    return res.json({
      success: true,
      message: 'استناد قانونی ضابطه به‌روزرسانی شد و هش منبع مجدداً محاسبه گردید.',
      version: updated,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/validate', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.validateRule(req.params.code, Number(req.params.version), actor);
    return res.json({
      success: true,
      valid: result.valid,
      errors: result.errors,
      version: result.version,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/test', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.testRule(req.params.code, Number(req.params.version), actor);
    return res.json({
      success: true,
      allPassed: result.allPassed,
      runs: result.runs,
      version: result.version,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/rules/:code/versions/:version/tests', (req: Request, res: Response) => {
  try {
    const tests = store.getRuleTests(req.params.code, Number(req.params.version));
    return res.json({ success: true, ...tests });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/submit-review', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const v = store.submitRuleForReview(req.params.code, Number(req.params.version), actor);
    return res.json({
      success: true,
      message: `نسخه ${req.params.code} v${req.params.version} جهت بررسی به کمیسیون تخصصی ارسال گردید.`,
      version: v,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/approve', (req: Request, res: Response) => {
  const { approver_name, notes } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'دکتر محمدرضا سلطانی (رئیس کمیسیون تخصصی)',
    role: (req.headers['x-user-role'] as string) || 'approver',
  };
  try {
    const v = store.approveRule(
      req.params.code,
      Number(req.params.version),
      approver_name || actor.name,
      notes,
      actor
    );
    return res.json({
      success: true,
      message: `نسخه ${req.params.code} v${req.params.version} رسماً مصوب گردید.`,
      version: v,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/reject', (req: Request, res: Response) => {
  const { reason } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'دکتر محمدرضا سلطانی (رئیس کمیسیون تخصصی)',
    role: (req.headers['x-user-role'] as string) || 'approver',
  };
  try {
    const v = store.rejectRule(req.params.code, Number(req.params.version), reason, actor);
    return res.json({
      success: true,
      message: 'ضابطه رد شد و به وضعیت پیش‌نویس بازگردانده شد.',
      version: v,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/request-changes', (req: Request, res: Response) => {
  const { reason } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'دکتر محمدرضا سلطانی (رئیس کمیسیون تخصصی)',
    role: (req.headers['x-user-role'] as string) || 'approver',
  };
  try {
    const v = store.requestRuleChanges(req.params.code, Number(req.params.version), reason, actor);
    return res.json({
      success: true,
      message: 'درخواست اصلاحات با موفقیت ثبت شد.',
      version: v,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/withdraw', (req: Request, res: Response) => {
  const { reason } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.withdrawRule(req.params.code, Number(req.params.version), reason, actor);
    return res.json({
      success: true,
      message: `نسخه ${req.params.code} v${req.params.version} از اعتبار ساقط شد (WITHDRAWN). مطالعات وابسته تحت تأثیر قرار گرفتند (${result.affectedStudiesCount} مطالعه).`,
      version: result.version,
      affectedStudiesCount: result.affectedStudiesCount,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 4. Rule Evaluation & Sandbox Engine
apiRouter.post('/rules/evaluate', (req: Request, res: Response) => {
  try {
    const evaluation = store.evaluateRule(req.body);
    return res.json({ success: true, evaluation });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rules/:code/versions/:version/sandbox', (req: Request, res: Response) => {
  try {
    const { inputs, units } = req.body;
    const result = store.sandboxEvaluateRule(
      req.params.code,
      Number(req.params.version),
      inputs || {},
      units || {}
    );
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 5. Conflicts & Precedence Policies
apiRouter.get('/rules-conflicts', (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const result = store.getRuleConflicts(code);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/rules-conflicts/resolve', (req: Request, res: Response) => {
  const { target_rule_code, precedes_rule_code, precedence_data } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const prec = store.resolveRuleConflict(target_rule_code, precedes_rule_code, precedence_data, actor);
    return res.json({
      success: true,
      message: `سلسله‌مراتب تقدم حقوقی ثبت شد: «${target_rule_code}» بر «${precedes_rule_code}» حاکم است.`,
      precedence: prec,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 6. Dependencies & Impact Analysis
apiRouter.get('/rules/:code/dependencies', (req: Request, res: Response) => {
  try {
    const deps = store.getRuleDependencies(req.params.code);
    return res.json({ success: true, ...deps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rules/:code/impact', (req: Request, res: Response) => {
  try {
    const fromV = req.query.from ? Number(req.query.from) : undefined;
    const toV = req.query.to ? Number(req.query.to) : undefined;
    const impact = store.getRuleImpact(req.params.code, fromV, toV);
    return res.json({ success: true, impact });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Rule Packs (Immutable Bundles)
apiRouter.get('/rule-packs', (_req: Request, res: Response) => {
  try {
    const packs = store.getRulePacks();
    return res.json({ success: true, packs, count: packs.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rule-packs/:id', (req: Request, res: Response) => {
  try {
    const details = store.getRulePack(req.params.id);
    if (!details) {
      return res.status(404).json({ error: `بسته ضوابط ${req.params.id} یافت نشد.` });
    }
    return res.json({ success: true, ...details });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/rule-packs', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const pack = store.createRulePack(req.body, actor);
    return res.status(201).json({
      success: true,
      message: `بسته ضوابط «${pack.title}» با موفقیت ایجاد گردید.`,
      pack,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-packs/:id/versions/:version/validate', (req: Request, res: Response) => {
  try {
    const val = store.validateRulePack(req.params.id, Number(req.params.version));
    return res.json({ success: true, ...val });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-packs/:id/versions/:version/approve', (req: Request, res: Response) => {
  const { approver_name, notes } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'دکتر محمدرضا سلطانی (رئیس کمیسیون تخصصی)',
    role: (req.headers['x-user-role'] as string) || 'approver',
  };
  try {
    const packV = store.approveRulePack(
      req.params.id,
      Number(req.params.version),
      approver_name || actor.name,
      notes,
      actor
    );
    return res.json({
      success: true,
      message: `بسته ضوابط ${req.params.id} نسخه v${req.params.version} مصوب شد.`,
      version: packV,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-packs/:id/versions/:version/publish', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.publishRulePack(req.params.id, Number(req.params.version), actor.name, actor);
    return res.json({
      success: true,
      message: `بسته ضوابط ${req.params.id} نسخه v${req.params.version} رسماً منتشر گردید و تغییرناپذیر شد.`,
      pack: result.pack,
      version: result.version,
      affectedStudiesNotified: result.affectedStudiesNotified,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 8. Rule Requests Pipeline & Auto-Unblock Integration
apiRouter.get('/rule-requests', (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as string,
      study_case_id: req.query.study_case_id as string,
      rule_code: req.query.rule_code as string,
      priority: req.query.priority as string,
    };
    const requests = store.getRuleRequests(filters);
    return res.json({ success: true, requests, count: requests.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/rule-requests/:id', (req: Request, res: Response) => {
  try {
    const request = store.getRuleRequest(req.params.id);
    if (!request) {
      return res.status(404).json({ error: `درخواست با شناسه ${req.params.id} یافت نشد.` });
    }
    return res.json({ success: true, request });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/rule-requests', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس زهرا کاظمی (تحلیلگر شهری)',
    role: (req.headers['x-user-role'] as string) || 'analyst',
  };
  try {
    const request = store.createRuleRequest(req.body, actor);
    return res.status(201).json({
      success: true,
      message: `درخواست ضابطه با شناسه «${request.id}» با موفقیت ثبت شد.`,
      request,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-requests/:id/start', (req: Request, res: Response) => {
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const request = store.startRuleRequest(req.params.id, actor);
    return res.json({
      success: true,
      message: `بررسی درخواست ضابطه ${req.params.id} آغاز گردید (IN_PROGRESS).`,
      request,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-requests/:id/fulfill', (req: Request, res: Response) => {
  const { fulfilled_version, pack_id, note } = req.body;
  if (!fulfilled_version) {
    return res.status(400).json({ error: 'شماره نسخه رسمی تأمین‌شده (fulfilled_version) الزامی است.' });
  }
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const result = store.fulfillRuleRequest(
      req.params.id,
      Number(fulfilled_version),
      pack_id || 'PACK-TEH-2026-v4',
      actor,
      note
    );
    return res.json({
      success: true,
      message: `درخواست با موفقیت تأمین شد و به مطالعه ${result.studyCase.id} متصل گردید. وضعیت مطالعه: ${result.studyCase.status}`,
      request: result.request,
      studyCase: result.studyCase,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/rule-requests/:id/reject', (req: Request, res: Response) => {
  const { reason } = req.body;
  const actor = {
    name: (req.headers['x-user-name'] as string) || 'مهندس لیلا اکبری (متولی قواعد و ضوابط)',
    role: (req.headers['x-user-role'] as string) || 'ruleman',
  };
  try {
    const request = store.rejectRuleRequest(req.params.id, reason, actor);
    return res.json({
      success: true,
      message: `درخواست ${req.params.id} رد شد.`,
      request,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 9. Study Case Rule Requirements
apiRouter.get('/study-cases/:id/rule-requirements', (req: Request, res: Response) => {
  try {
    const requirements = store.getStudyCaseRuleRequirements(req.params.id);
    return res.json({ success: true, requirements, count: requirements.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
