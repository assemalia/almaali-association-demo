/**
 * بيانات النسخة التجريبية (Mock) — تُحمَّل في ذاكرة المتصفح.
 * مطابقة لمنطق supabase/seed.sql، مع إضافة ملف مستخدم العرض ودوره
 * حتى يعمل الدخول دون قاعدة بيانات.
 *
 * كل استدعاء لـ buildSeed() يُنشئ نسخة جديدة تمامًا (تواريخ محسوبة نسبةً لليوم).
 */

/** معرّف مستخدم العرض (admin) — يستعمله auth الوهمي أيضًا. */
export const DEMO_USER_ID = '00000000-0000-0000-0000-0000000000a1';

type Row = Record<string, unknown>;
type Database = Record<string, Row[]>;

const pad = (n: number) => String(n).padStart(2, '0');
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateOnly(d);
}
function tsOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function monthYear(monthsAgo: number): { month: number; year: number } {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function buildSeed(): Database {
  const cur = monthYear(0);
  const prev = monthYear(1);

  return {
    // ── ملف مستخدم العرض + دوره (ليعمل الدخول بلا قاعدة بيانات) ──
    profiles: [
      {
        id: 'aaaaaaaa-0000-0000-0000-0000000000a1',
        user_id: DEMO_USER_ID,
        full_name: 'مدير العرض',
        phone: '0550000000',
        is_approved: true,
        created_at: tsOffset(-90),
        updated_at: tsOffset(-1),
      },
    ],
    user_roles: [
      { id: 'bbbbbbbb-0000-0000-0000-0000000000a1', user_id: DEMO_USER_ID, role: 'admin', is_global: true },
    ],
    user_group_permissions: [],

    projects: [
      { id: '11111111-1111-1111-1111-111111111111', name: 'مشروع تحفيظ القرآن الكريم', description: 'حلقات تحفيظ ومراجعة أسبوعية للناشئة', created_at: tsOffset(-80) },
      { id: '11111111-1111-1111-1111-111111111112', name: 'مشروع الدعم الدراسي', description: 'دروس دعم ومرافقة مدرسية للتلاميذ', created_at: tsOffset(-78) },
      { id: '11111111-1111-1111-1111-111111111113', name: 'مشروع الأنشطة الثقافية', description: 'ورشات ومسابقات ثقافية وتربوية', created_at: tsOffset(-76) },
    ],

    topics: [
      { id: '22222222-2222-2222-2222-222222222221', name: 'التجويد', description: 'أحكام تلاوة القرآن الكريم', created_at: tsOffset(-80) },
      { id: '22222222-2222-2222-2222-222222222222', name: 'حفظ القرآن الكريم', description: 'حفظ ومراجعة القرآن الكريم مع التدبّر', created_at: tsOffset(-80) },
      { id: '22222222-2222-2222-2222-222222222223', name: 'الفقه والعبادات', description: 'أحكام العبادات والمعاملات', created_at: tsOffset(-80) },
      { id: '22222222-2222-2222-2222-222222222224', name: 'العقيدة والتربية الإيمانية', description: 'أركان الإيمان وترسيخ العقيدة وتزكية النفس', created_at: tsOffset(-80) },
      { id: '22222222-2222-2222-2222-222222222225', name: 'الأخلاق والآداب الإسلامية', description: 'التربية على مكارم الأخلاق والآداب', created_at: tsOffset(-80) },
      { id: '22222222-2222-2222-2222-222222222226', name: 'المهارات الحياتية والقيادة', description: 'مهارات حياتية وقيادية وعمل تطوّعي للناشئة', created_at: tsOffset(-80) },
    ],

    skills: [
      { id: '33333333-3333-3333-3333-333333333331', name: 'الخطابة', description: 'مهارة الإلقاء ومخاطبة الجمهور', created_at: tsOffset(-80) },
      { id: '33333333-3333-3333-3333-333333333332', name: 'التنظيم', description: 'تنظيم الوقت وإدارة المهام', created_at: tsOffset(-80) },
      { id: '33333333-3333-3333-3333-333333333333', name: 'القيادة', description: 'قيادة الفريق واتخاذ القرار', created_at: tsOffset(-80) },
      { id: '33333333-3333-3333-3333-333333333334', name: 'العمل الجماعي', description: 'التعاون ضمن فريق', created_at: tsOffset(-80) },
      { id: '33333333-3333-3333-3333-333333333335', name: 'الإلقاء الشعري', description: 'إلقاء القصائد والأناشيد', created_at: tsOffset(-80) },
    ],

    groups: [
      { id: '44444444-4444-4444-4444-444444444441', name: 'فوج الفرقان', project_id: '11111111-1111-1111-1111-111111111111', educator_id: null, monthly_fee: 500, meeting_fee: 50, created_at: tsOffset(-70) },
      { id: '44444444-4444-4444-4444-444444444442', name: 'فوج النور', project_id: '11111111-1111-1111-1111-111111111111', educator_id: null, monthly_fee: 500, meeting_fee: 50, created_at: tsOffset(-68) },
      { id: '44444444-4444-4444-4444-444444444443', name: 'فوج التفوّق', project_id: '11111111-1111-1111-1111-111111111112', educator_id: null, monthly_fee: 300, meeting_fee: 0, created_at: tsOffset(-66) },
      { id: '44444444-4444-4444-4444-444444444444', name: 'فوج الإبداع', project_id: '11111111-1111-1111-1111-111111111113', educator_id: null, monthly_fee: 0, meeting_fee: 100, created_at: tsOffset(-64) },
    ],

    members: [
      { id: '55555555-5555-5555-5555-555555555551', first_name: 'أحمد', last_name: 'بن علي', phone: '0550000001', date_of_birth: '2012-03-14', group_id: '44444444-4444-4444-4444-444444444441', status: 'active', guardian_name: 'علي بن علي', guardian_phone: '0660000001', notes: 'منتظم ومتميّز في الحفظ', created_at: tsOffset(-50), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555552', first_name: 'يوسف', last_name: 'قاسمي', phone: '0550000002', date_of_birth: '2011-07-22', group_id: '44444444-4444-4444-4444-444444444441', status: 'active', guardian_name: 'محمد قاسمي', guardian_phone: '0660000002', notes: null, created_at: tsOffset(-49), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555553', first_name: 'خديجة', last_name: 'مرزوقي', phone: '0550000003', date_of_birth: '2013-01-09', group_id: '44444444-4444-4444-4444-444444444442', status: 'active', guardian_name: 'سعيد مرزوقي', guardian_phone: '0660000003', notes: null, created_at: tsOffset(-48), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555554', first_name: 'مريم', last_name: 'حمادي', phone: '0550000004', date_of_birth: '2012-11-30', group_id: '44444444-4444-4444-4444-444444444442', status: 'inactive', guardian_name: 'كمال حمادي', guardian_phone: '0660000004', notes: 'انقطعت مؤقتًا', created_at: tsOffset(-47), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555555', first_name: 'عبد الله', last_name: 'شريف', phone: '0550000005', date_of_birth: '2010-05-18', group_id: '44444444-4444-4444-4444-444444444441', status: 'active', guardian_name: 'ناصر شريف', guardian_phone: '0660000005', notes: null, created_at: tsOffset(-46), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555556', first_name: 'فاطمة', last_name: 'بوزيان', phone: '0550000006', date_of_birth: '2013-09-02', group_id: '44444444-4444-4444-4444-444444444443', status: 'active', guardian_name: 'رشيد بوزيان', guardian_phone: '0660000006', notes: 'بحاجة لدعم في الرياضيات', created_at: tsOffset(-45), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555557', first_name: 'إبراهيم', last_name: 'عثماني', phone: '0550000007', date_of_birth: '2011-12-12', group_id: '44444444-4444-4444-4444-444444444443', status: 'active', guardian_name: 'طارق عثماني', guardian_phone: '0660000007', notes: null, created_at: tsOffset(-44), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555558', first_name: 'زينب', last_name: 'لعموري', phone: '0550000008', date_of_birth: '2012-06-25', group_id: '44444444-4444-4444-4444-444444444444', status: 'active', guardian_name: 'عمر لعموري', guardian_phone: '0660000008', notes: null, created_at: tsOffset(-43), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-555555555559', first_name: 'حمزة', last_name: 'دحماني', phone: '0550000009', date_of_birth: '2010-02-07', group_id: '44444444-4444-4444-4444-444444444444', status: 'active', guardian_name: 'بلال دحماني', guardian_phone: '0660000009', notes: 'موهوب في الإلقاء', created_at: tsOffset(-42), updated_at: tsOffset(-5) },
      { id: '55555555-5555-5555-5555-55555555555a', first_name: 'سارة', last_name: 'بلقاسم', phone: '0550000010', date_of_birth: '2013-04-19', group_id: '44444444-4444-4444-4444-444444444442', status: 'active', guardian_name: 'يونس بلقاسم', guardian_phone: '0660000010', notes: null, created_at: tsOffset(-41), updated_at: tsOffset(-5) },
    ],

    member_topics: [
      { id: 'mt-0001', member_id: '55555555-5555-5555-5555-555555555551', topic_id: '22222222-2222-2222-2222-222222222221' },
      { id: 'mt-0002', member_id: '55555555-5555-5555-5555-555555555551', topic_id: '22222222-2222-2222-2222-222222222222' },
      { id: 'mt-0003', member_id: '55555555-5555-5555-5555-555555555552', topic_id: '22222222-2222-2222-2222-222222222222' },
      { id: 'mt-0004', member_id: '55555555-5555-5555-5555-555555555553', topic_id: '22222222-2222-2222-2222-222222222221' },
      { id: 'mt-0005', member_id: '55555555-5555-5555-5555-555555555555', topic_id: '22222222-2222-2222-2222-222222222224' },
      { id: 'mt-0006', member_id: '55555555-5555-5555-5555-555555555556', topic_id: '22222222-2222-2222-2222-222222222225' },
      { id: 'mt-0007', member_id: '55555555-5555-5555-5555-555555555557', topic_id: '22222222-2222-2222-2222-222222222226' },
    ],

    member_skills: [
      { id: 'ms-0001', member_id: '55555555-5555-5555-5555-555555555551', skill_id: '33333333-3333-3333-3333-333333333331' },
      { id: 'ms-0002', member_id: '55555555-5555-5555-5555-555555555555', skill_id: '33333333-3333-3333-3333-333333333333' },
      { id: 'ms-0003', member_id: '55555555-5555-5555-5555-555555555559', skill_id: '33333333-3333-3333-3333-333333333335' },
      { id: 'ms-0004', member_id: '55555555-5555-5555-5555-555555555558', skill_id: '33333333-3333-3333-3333-333333333334' },
    ],

    meetings: [
      { id: '66666666-6666-6666-6666-666666666661', group_id: '44444444-4444-4444-4444-444444444441', title: 'لقاء افتتاحي', meeting_date: dayOffset(-21), opening_speech_title: 'أهمية طلب العلم', opening_speech_content: null, opening_speech_presenter: 'المربّي المشرف', created_by: null, created_at: tsOffset(-21) },
      { id: '66666666-6666-6666-6666-666666666662', group_id: '44444444-4444-4444-4444-444444444441', title: 'لقاء المراجعة', meeting_date: dayOffset(-14), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(-14) },
      { id: '66666666-6666-6666-6666-666666666663', group_id: '44444444-4444-4444-4444-444444444441', title: 'لقاء الحفظ الجديد', meeting_date: dayOffset(-7), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(-7) },
      { id: '66666666-6666-6666-6666-666666666664', group_id: '44444444-4444-4444-4444-444444444441', title: 'لقاء هذا الأسبوع', meeting_date: dayOffset(0), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(0) },
      { id: '66666666-6666-6666-6666-666666666665', group_id: '44444444-4444-4444-4444-444444444442', title: 'لقاء افتتاحي', meeting_date: dayOffset(-10), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(-10) },
      { id: '66666666-6666-6666-6666-666666666666', group_id: '44444444-4444-4444-4444-444444444443', title: 'حصة دعم الرياضيات', meeting_date: dayOffset(-5), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(-5) },
      { id: '66666666-6666-6666-6666-666666666667', group_id: '44444444-4444-4444-4444-444444444444', title: 'ورشة الإلقاء', meeting_date: dayOffset(-3), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(-3) },
      { id: '66666666-6666-6666-6666-666666666668', group_id: '44444444-4444-4444-4444-444444444441', title: 'لقاء قادم', meeting_date: dayOffset(7), opening_speech_title: null, opening_speech_content: null, opening_speech_presenter: null, created_by: null, created_at: tsOffset(0) },
    ],

    lessons: [
      { id: '77777777-7777-7777-7777-777777777771', meeting_id: '66666666-6666-6666-6666-666666666661', title: 'أحكام النون الساكنة والتنوين', topic_id: '22222222-2222-2222-2222-222222222221', key_points: 'الإظهار، الإدغام، الإقلاب، الإخفاء', content: null, presenter: 'المربّي المشرف', created_at: tsOffset(-21) },
      { id: '77777777-7777-7777-7777-777777777772', meeting_id: '66666666-6666-6666-6666-666666666662', title: 'تدبّر سورة الملك', topic_id: '22222222-2222-2222-2222-222222222222', key_points: 'الحفظ المتقن مع التدبّر والعمل بالآيات', content: null, presenter: null, created_at: tsOffset(-14) },
      { id: '77777777-7777-7777-7777-777777777773', meeting_id: '66666666-6666-6666-6666-666666666663', title: 'آداب طالب العلم', topic_id: '22222222-2222-2222-2222-222222222225', key_points: 'الإخلاص، التواضع، احترام المعلّم، حفظ الوقت', content: null, presenter: null, created_at: tsOffset(-7) },
      { id: '77777777-7777-7777-7777-777777777774', meeting_id: '66666666-6666-6666-6666-666666666666', title: 'مهارات التعلّم والتركيز', topic_id: '22222222-2222-2222-2222-222222222226', key_points: 'التخطيط وتنظيم الوقت وأساليب المذاكرة النافعة', content: null, presenter: null, created_at: tsOffset(-5) },
    ],

    attendance: [
      { id: 'att-0001', meeting_id: '66666666-6666-6666-6666-666666666661', member_id: '55555555-5555-5555-5555-555555555551', status: 'present', notes: null, created_at: tsOffset(-21) },
      { id: 'att-0002', meeting_id: '66666666-6666-6666-6666-666666666661', member_id: '55555555-5555-5555-5555-555555555552', status: 'present', notes: null, created_at: tsOffset(-21) },
      { id: 'att-0003', meeting_id: '66666666-6666-6666-6666-666666666661', member_id: '55555555-5555-5555-5555-555555555555', status: 'absent', notes: 'غياب بعذر', created_at: tsOffset(-21) },
      { id: 'att-0004', meeting_id: '66666666-6666-6666-6666-666666666662', member_id: '55555555-5555-5555-5555-555555555551', status: 'present', notes: null, created_at: tsOffset(-14) },
      { id: 'att-0005', meeting_id: '66666666-6666-6666-6666-666666666662', member_id: '55555555-5555-5555-5555-555555555552', status: 'excused', notes: 'سفر عائلي', created_at: tsOffset(-14) },
      { id: 'att-0006', meeting_id: '66666666-6666-6666-6666-666666666662', member_id: '55555555-5555-5555-5555-555555555555', status: 'present', notes: null, created_at: tsOffset(-14) },
      { id: 'att-0007', meeting_id: '66666666-6666-6666-6666-666666666663', member_id: '55555555-5555-5555-5555-555555555551', status: 'present', notes: null, created_at: tsOffset(-7) },
      { id: 'att-0008', meeting_id: '66666666-6666-6666-6666-666666666663', member_id: '55555555-5555-5555-5555-555555555552', status: 'present', notes: null, created_at: tsOffset(-7) },
      { id: 'att-0009', meeting_id: '66666666-6666-6666-6666-666666666663', member_id: '55555555-5555-5555-5555-555555555555', status: 'absent', notes: null, created_at: tsOffset(-7) },
      { id: 'att-0010', meeting_id: '66666666-6666-6666-6666-666666666666', member_id: '55555555-5555-5555-5555-555555555556', status: 'present', notes: null, created_at: tsOffset(-5) },
      { id: 'att-0011', meeting_id: '66666666-6666-6666-6666-666666666666', member_id: '55555555-5555-5555-5555-555555555557', status: 'present', notes: null, created_at: tsOffset(-5) },
    ],

    subscriptions: [
      { id: 'sub-0001', member_id: '55555555-5555-5555-5555-555555555551', month: cur.month, year: cur.year, amount: 500, is_paid: true, paid_at: tsOffset(-2), notes: null, created_at: tsOffset(-2) },
      { id: 'sub-0002', member_id: '55555555-5555-5555-5555-555555555552', month: cur.month, year: cur.year, amount: 500, is_paid: false, paid_at: null, notes: null, created_at: tsOffset(-2) },
      { id: 'sub-0003', member_id: '55555555-5555-5555-5555-555555555553', month: cur.month, year: cur.year, amount: 500, is_paid: true, paid_at: tsOffset(-2), notes: null, created_at: tsOffset(-2) },
      { id: 'sub-0004', member_id: '55555555-5555-5555-5555-555555555555', month: cur.month, year: cur.year, amount: 500, is_paid: false, paid_at: null, notes: null, created_at: tsOffset(-2) },
      { id: 'sub-0005', member_id: '55555555-5555-5555-5555-555555555556', month: cur.month, year: cur.year, amount: 300, is_paid: true, paid_at: tsOffset(-2), notes: null, created_at: tsOffset(-2) },
      { id: 'sub-0006', member_id: '55555555-5555-5555-5555-555555555551', month: prev.month, year: prev.year, amount: 500, is_paid: true, paid_at: tsOffset(-32), notes: null, created_at: tsOffset(-32) },
      { id: 'sub-0007', member_id: '55555555-5555-5555-5555-555555555552', month: prev.month, year: prev.year, amount: 500, is_paid: true, paid_at: tsOffset(-32), notes: null, created_at: tsOffset(-32) },
      { id: 'sub-0008', member_id: '55555555-5555-5555-5555-555555555555', month: prev.month, year: prev.year, amount: 500, is_paid: false, paid_at: null, notes: null, created_at: tsOffset(-32) },
    ],

    meeting_payments: [
      { id: 'mp-0001', meeting_id: '66666666-6666-6666-6666-666666666661', member_id: '55555555-5555-5555-5555-555555555551', amount: 50, is_paid: true, paid_at: tsOffset(-20), notes: null, created_at: tsOffset(-21) },
      { id: 'mp-0002', meeting_id: '66666666-6666-6666-6666-666666666661', member_id: '55555555-5555-5555-5555-555555555552', amount: 50, is_paid: false, paid_at: null, notes: null, created_at: tsOffset(-21) },
      { id: 'mp-0003', meeting_id: '66666666-6666-6666-6666-666666666663', member_id: '55555555-5555-5555-5555-555555555551', amount: 50, is_paid: true, paid_at: tsOffset(-6), notes: null, created_at: tsOffset(-7) },
      { id: 'mp-0004', meeting_id: '66666666-6666-6666-6666-666666666667', member_id: '55555555-5555-5555-5555-555555555558', amount: 100, is_paid: false, paid_at: null, notes: null, created_at: tsOffset(-3) },
      { id: 'mp-0005', meeting_id: '66666666-6666-6666-6666-666666666667', member_id: '55555555-5555-5555-5555-555555555559', amount: 100, is_paid: true, paid_at: tsOffset(-2), notes: null, created_at: tsOffset(-3) },
    ],

    notifications: [
      { id: 'ntf-0001', user_id: DEMO_USER_ID, type: 'overdue_subscription', title: 'اشتراك متأخّر', message: 'العضو يوسف قاسمي لم يسدّد اشتراك هذا الشهر.', is_read: false, related_member_id: '55555555-5555-5555-5555-555555555552', related_group_id: '44444444-4444-4444-4444-444444444441', metadata: {}, created_at: tsOffset(-1) },
      { id: 'ntf-0002', user_id: DEMO_USER_ID, type: 'repeated_absence', title: 'غياب متكرّر', message: 'العضو عبد الله شريف تغيّب في أكثر من لقاء.', is_read: false, related_member_id: '55555555-5555-5555-5555-555555555555', related_group_id: '44444444-4444-4444-4444-444444444441', metadata: {}, created_at: tsOffset(0) },
    ],
  };
}
