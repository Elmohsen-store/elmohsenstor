// المحسن ستور - Supabase Config
// نفس إعدادات ملفك، مع إنشاء عميل Supabase لكي تعمل صفحات المتجر.

const SUPABASE_URL = 'https://hkmlicxlzueogiqibbuj.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_JQUecUA5kUeRshsSzS-TKQ_uIq4De82';

const STORE_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY: SUPABASE_PUBLISHABLE_KEY
};

// يجب تحميل supabase-js قبل هذا الملف.
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  console.error(
    'Supabase JS غير محملة. حمّل مكتبة @supabase/supabase-js قبل config.js'
  );
} else {
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      db: { schema: 'public' },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );

  // متاح لباقي ملفات المتجر.
  window.supabaseClient = supabase;
}
