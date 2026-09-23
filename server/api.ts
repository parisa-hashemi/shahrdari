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
