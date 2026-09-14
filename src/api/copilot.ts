/**
 * Mock evidence-aware copilot (FSD-B16).
 *
 * Rules encoded here and enforced in the UI:
 *  - every substantive answer carries citations to accessible sources;
 *  - the assistant never approves, never bypasses permissions and never
 *    claims a model ran when it did not;
 *  - any mutating suggestion is returned as a `proposedAction` that the user
 *    must confirm explicitly, under the normal permission checks.
 */
import type { CopilotMessage } from '@/types/domain';
import { deterministicId } from '@/utils/id';
import { call } from './client';

interface Reply {
  text: string;
  citations: CopilotMessage['citations'];
  limitationNote?: string;
  proposedAction?: CopilotMessage['proposedAction'];
}

const SOURCES = {
  parcels: {
    label: 'داده قطعات و کاربری اراضی',
    sourceType: 'dataset' as const,
    versionLabel: 'v3.2 — ۱۴۰۵/۰۲',
    accessible: true,
    href: '/datasets/ds-parcels',
  },
  buildings: {
    label: 'داده ابنیه، طبقات و ارتفاع',
    sourceType: 'dataset' as const,
    versionLabel: 'v2.1 — ۱۴۰۴/۱۱',
    accessible: true,
    href: '/datasets/ds-buildings',
  },
  network: {
    label: 'شبکه معابر مسیریابی‌پذیر',
    sourceType: 'dataset' as const,
    versionLabel: 'v1.0 — منتشرنشده',
    accessible: true,
    href: '/datasets/ds-network',
  },
  ruleFar: {
    label: 'قانون حداکثر تراکم (نمونه)',
    sourceType: 'rule' as const,
    versionLabel: 'v3',
    accessible: true,
    href: '/rules/rule-far',
  },
  rulePrk: {
    label: 'قانون تأمین پارکینگ (نمونه)',
    sourceType: 'rule' as const,
    versionLabel: 'v2',
    accessible: true,
    href: '/rules/rule-prk',
  },
  runS1: {
    label: 'نتایج اجرای سناریو S1',
    sourceType: 'result' as const,
    versionLabel: 'RUN-1405-2001',
    accessible: true,
    href: '/scenarios/scn-s1',
  },
  modelTransport: {
    label: 'مدل تخصصی حمل‌ونقل شهری',
    sourceType: 'model' as const,
    versionLabel: 'v0.4 — اعتبارسنجی‌نشده',
    accessible: true,
    href: '/models/mdl-transport',
  },
  externalStudy: {
    label: 'گزارش مطالعه ترافیکی خارجی',
    sourceType: 'document' as const,
    versionLabel: 'v1',
    accessible: false,
  },
};

function buildReply(question: string): Reply {
  const q = question.trim();

  if (/تأیید|تایید|approve|مجوز|پروانه/.test(q)) {
    return {
      text:
        'من نمی‌توانم چیزی را تأیید کنم. تأیید بررسی و تأیید سازمانی تنها توسط بازبین و مرجع تأیید منتصب و در گردش‌کار سامانه ثبت می‌شود. همچنین تأیید در این سامانه به‌معنای مجوز قانونی یا صدور پروانه نیست.\n\nمی‌توانم وضعیت فعلی بررسی‌ها را برای شما خلاصه کنم یا موارد در انتظار تصمیم را نشان دهم.',
      citations: [SOURCES.runS1],
      limitationNote:
        'دستیار هوشمند اختیار تأیید، تغییر مجوزها یا دور زدن گردش‌کار را ندارد.',
    };
  }

  if (/سایه|تابش|M09/.test(q)) {
    return {
      text:
        'ماژول سایه و تابش در این اجرا نتیجه‌ای تولید نکرده است. علت، نبود ورودی معتبر است: ارتفاع ثبت‌شده تنها برای ۷۱٪ ابنیه محدوده موجود است و مدل ارتفاعی زمین تأییدشده‌ای بارگذاری نشده است.\n\nاین وضعیت با «صفر» تفاوت دارد؛ هیچ مقداری محاسبه نشده و نباید به‌عنوان نبود سایه تفسیر شود.\n\nبرای فعال‌شدن این ماژول: تکمیل پوشش ارتفاع ابنیه و انتشار نسخه معتبر آن لازم است.',
      citations: [SOURCES.buildings],
      limitationNote: 'هیچ مدلی برای سایه و تابش اجرا نشده است.',
    };
  }

  if (/دسترسی|پوشش|شبکه|M07/.test(q)) {
    return {
      text:
        'تحلیل دسترسی شبکه‌محور اجرا نشده است. نسخه فعلی شبکه معابر در وضعیت «آماده» است اما منتشر نشده و مقادیر مقاومت مسیر و جهت حرکت در آن تعریف نشده‌اند؛ بنابراین محاسبه حوزه دسترسی ممکن نیست.\n\nمدل تخصصی حمل‌ونقل نیز در دسترس نیست و اعتبارسنجی نشده است.',
      citations: [SOURCES.network, SOURCES.modelTransport],
      limitationNote: 'نتیجه‌ای برای این ماژول وجود ندارد؛ خروجی صفر نیست.',
    };
  }

  if (/تفاوت|مقایسه|سناریو/.test(q)) {
    return {
      text:
        'تفاوت سناریو S1 نسبت به وضع موجود S0 در همان قطعه نمونه:\n\n• زیربنای ناخالص: ۲٬۰۰۰ → ۳٬۰۰۰ مترمربع (+۵۰٪)\n• ظرفیت واحد مسکونی: ۲۰ → ۳۰ واحد (+۵۰٪)\n• جمعیت بالقوه: ۶۰ → ۹۰ نفر (برآورد، نه پیش‌بینی جمعیت)\n• سفر خودرو روزانه: ۶۰ → ۹۰ سرانجام سفر (+۵۰٪)\n• کسری پارکینگ: ۷ → ۸ واحد\n• کسری فضای سبز: ۰ → ۲۱۰ مترمربع\n\nهر دو سناریو کنترل پارکینگ را رد می‌کنند و کنترل‌های عقب‌نشینی و پهنه‌بندی نامشخص مانده‌اند؛ بنابراین S1 نمی‌تواند برچسب «پیشنهادی منطبق» بگیرد.',
      citations: [SOURCES.runS1, SOURCES.rulePrk, SOURCES.parcels],
      limitationNote:
        'مقادیر بر پایه ضرایب نمونه محاسبه شده‌اند و کالیبراسیون محلی ندارند.',
    };
  }

  if (/کامل|فصل|خلأ|ناقص|آمادگی/.test(q)) {
    return {
      text:
        'وضعیت کامل‌بودن مطالعه «طرح تفصیلی محور شمالی»:\n\n• فصل ۰: ۹ قلم از ۱۲ قلم داده موردنیاز بسته شده است.\n• دو ماژول تحلیلی (دسترسی و پوشش، سایه و تابش) به دلیل نبود ورودی معتبر اجرا نشده‌اند.\n• یک نسخه داده در وضعیت قرنطینه است (ابنیه v2.2).\n• دو کنترل قانون در وضعیت «نامشخص» باقی مانده‌اند و یکی از آن‌ها تعارض حل‌نشده دارد.\n\nتا زمان رفع این موارد، گزارش رسمی با برچسب «شواهد تحلیلی ناقص» تولید می‌شود.',
      citations: [SOURCES.buildings, SOURCES.parcels, SOURCES.ruleFar],
    };
  }

  if (/گزارش|پیش‌نویس|بسته تصمیم/.test(q)) {
    return {
      text:
        'می‌توانم پیش‌نویس گزارش مقایسه‌ای را بر پایه نتایج موجود آماده کنم. این پیش‌نویس شامل خلاصه تصمیم، وضع موجود، تعریف سناریو، نتایج تحلیلی و بخش محدودیت‌ها خواهد بود و ماژول‌های اجرانشده به‌صراحت در آن فهرست می‌شوند.\n\nپیش از ایجاد، تغییرها را ببینید و در صورت تأیید، دکمه «انجام بده» را بزنید.',
      citations: [SOURCES.runS1],
      proposedAction: {
        key: 'create_report_draft',
        title: 'ایجاد پیش‌نویس گزارش مقایسه سناریوها',
        preview: [
          'ایجاد یک گزارش جدید در وضعیت «پیش‌نویس» برای مطالعه «طرح تفصیلی محور شمالی»',
          'درج نتایج اجرای RUN-1405-2001 با نسخه داده‌های پین‌شده',
          'افزودن بخش محدودیت‌ها و فهرست ماژول‌های اجرانشده (M07، M09)',
          'بدون هرگونه تأیید، انتشار یا تغییر در نسخه‌های قفل‌شده',
        ],
        permitted: true,
      },
    };
  }

  if (/پارکینگ/.test(q)) {
    return {
      text:
        'در سناریو S1، الزام پارکینگ ۳۸ واحد و عرضه مستند ۳۰ واحد است؛ بنابراین ۸ واحد کسری ثبت شده است.\n\nتوجه: «عرضه مستند» تنها ظرفیت ثبت‌شده را نشان می‌دهد. نبود رکورد به‌معنای نبود پارکینگ نیست و این عدد تقاضای مدل‌شده بازار هم نیست.',
      citations: [SOURCES.rulePrk, SOURCES.runS1],
      limitationNote: 'الزام مقرراتی با تقاضای بازار یکسان نیست.',
    };
  }

  if (/محرمانه|دسترسی من|خارجی/.test(q)) {
    return {
      text:
        'یکی از منابع مرتبط با این پرسش در دامنه دسترسی شما نیست و محتوای آن بازیابی نشده است. پاسخ زیر تنها بر منابع در دسترس شما تکیه دارد.',
      citations: [SOURCES.parcels, SOURCES.externalStudy],
      limitationNote: 'یک منبع به دلیل محدودیت دسترسی استفاده نشده است.',
    };
  }

  return {
    text:
      'پاسخ من تنها بر اسناد، داده‌ها و نتایج در دسترس شما تکیه دارد. برای این پرسش، منابع زیر مرتبط‌اند. اگر پرسش دقیق‌تری مطرح کنید — مثلاً درباره یک ماژول، یک نسخه داده یا تفاوت دو سناریو — پاسخ مشخص‌تری با ارجاع دقیق ارائه می‌کنم.\n\nنمونه پرسش‌ها: «چرا نتیجه سایه و تابش موجود نیست؟»، «تفاوت S0 و S1 چیست؟»، «کامل‌بودن مطالعه را بررسی کن».',
    citations: [SOURCES.parcels, SOURCES.ruleFar],
  };
}

export const copilotApi = {
  /** POST /copilot/sessions/{id}/messages */
  ask: (question: string, index: number) =>
    call<CopilotMessage>('/copilot/sessions/current/messages', () => {
      const reply = buildReply(question);
      return {
        id: deterministicId('msg', `${question}-${index}`),
        role: 'assistant',
        text: reply.text,
        at: new Date().toISOString(),
        citations: reply.citations,
        limitationNote: reply.limitationNote,
        proposedAction: reply.proposedAction,
      } satisfies CopilotMessage;
    }, { method: 'POST', body: { text: question } }),
};
