// config.js - إعدادات المسارات، الثوابت، والمزامنة السحابية

const CONFIG = {
  // رابط الخادم الخلفي
  API_BASE_URL: 'https://chatzeus.vercel.app/api', // ⚠️ تأكد أن هذا هو الرابط الصحيح لخادمك

  STORAGE_KEYS: {
    API_KEYS: 'zeus_translator_api_keys',
    GLOSSARY: 'zeus_translator_glossary',
    ENGLISH_CHAPTERS: 'zeus_translator_english_chapters',
    TRANSLATED_CHAPTERS: 'zeus_translator_translated_chapters',
    CURRENT_KEY_INDICES: 'zeus_translator_key_indices',
    FAILED_KEYS: 'zeus_translator_failed_keys',
    PROMPT_TRANSLATE: 'zeus_translator_prompt_translate',
    PROMPT_EXTRACT: 'zeus_translator_prompt_extract',
    AUTH_TOKEN: 'zeus_auth_token', // ✨ مفتاح التوكن الجديد
    USER_INFO: 'zeus_user_info'    // ✨ بيانات المستخدم
  },
  DEFAULT_TIMEOUT: 120,
  MAX_KEY_ATTEMPTS: 10,
  PROVIDERS: ['Google', 'OpenAI', 'Together', 'Gemini'],
  MODELS: {
    OpenAI: 'gpt-3.5-turbo',
    Together: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    Gemini: 'gemini-2.5-pro',
    GeminiFlash: 'gemini-2.5-flash'
  }
};

// === إدارة المصادقة ===
const Auth = {
    getToken: () => localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN),
    setToken: (token) => localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token),
    isLoggedIn: () => !!localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN),
    logout: () => {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
        window.location.href = 'login.html';
    }
};

// === دوال مساعدة للتخزين المحلي والسحابي ===
const Storage = {
  // جلب بيانات (محلياً أولاً للسرعة)
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('خطأ في جلب البيانات:', e);
      return defaultValue;
    }
  },

  // حفظ بيانات (محلياً + سحابياً إذا مسجل الدخول)
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      
      // ☁️ المزامنة الخلفية (Fire and Forget)
      if (Auth.isLoggedIn()) {
          syncItemToServer(key, value);
      }
      return true;
    } catch (e) {
      console.error('خطأ في حفظ البيانات:', e);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  },

  // ✨ دالة المزامنة الكاملة (تستدعى عند تحميل الصفحة)
  syncWithServer: async () => {
      if (!Auth.isLoggedIn()) return;
      
      const token = Auth.getToken();
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      try {
          console.log('🔄 جاري مزامنة البيانات مع الخادم...');

          // 1. جلب المسرد ودمجه
          const glossaryRes = await fetch(`${CONFIG.API_BASE_URL}/sync/glossary`, { headers });
          if (glossaryRes.ok) {
              const serverGlossary = await glossaryRes.json();
              // حفظ في LocalStorage (الخادم هو المصدر الموثوق عند البدء)
              localStorage.setItem(CONFIG.STORAGE_KEYS.GLOSSARY, JSON.stringify(serverGlossary));
          }

          // 2. جلب الفصول
          const chaptersRes = await fetch(`${CONFIG.API_BASE_URL}/sync/chapters`, { headers });
          if (chaptersRes.ok) {
              const serverChapters = await chaptersRes.json();
              
              const englishChapters = {};
              const translatedChapters = {};

              // فصل البيانات القادمة من الخادم
              Object.entries(serverChapters).forEach(([filename, data]) => {
                  if (data.content) {
                      englishChapters[filename] = { content: data.content, modified: data.modified };
                  }
                  if (data.translatedContent) {
                      translatedChapters[filename] = { content: data.translatedContent, modified: data.modified };
                  }
              });

              localStorage.setItem(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS, JSON.stringify(englishChapters));
              localStorage.setItem(CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS, JSON.stringify(translatedChapters));
          }
          
          console.log('✅ تمت المزامنة بنجاح');
      } catch (error) {
          console.error('❌ فشل المزامنة:', error);
      }
  }
};

// ☁️ منطق إرسال البيانات للخادم (داخلي)
async function syncItemToServer(key, value) {
    const token = Auth.getToken();
    if (!token) return;

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
        if (key === CONFIG.STORAGE_KEYS.GLOSSARY) {
            await fetch(`${CONFIG.API_BASE_URL}/sync/glossary`, {
                method: 'POST',
                headers,
                body: JSON.stringify(value)
            });
        } 
        else if (key === CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS || key === CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS) {
            // تحويل هيكل البيانات ليناسب الخادم
            const chaptersList = Object.entries(value).map(([fileName, data]) => ({
                fileName,
                content: key === CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS ? data.content : undefined,
                translatedContent: key === CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS ? data.content : undefined,
                modified: data.modified
            }));

            await fetch(`${CONFIG.API_BASE_URL}/sync/chapters`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ chapters: chaptersList })
            });
        }
    } catch (e) {
        console.warn('Background sync failed:', e);
    }
}

// تهيئة البيانات الافتراضية والمزامنة
function initializeApp() {
  // التحقق من وجود توكن في الرابط (بعد العودة من جوجل)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
      Auth.setToken(token);
      // تنظيف الرابط
      window.history.replaceState({}, document.title, window.location.pathname);
      // بدء المزامنة فوراً
      Storage.syncWithServer().then(() => {
          window.location.reload(); // إعادة تحميل لتطبيق البيانات
      });
  } else if (Auth.isLoggedIn()) {
      // مزامنة هادئة في الخلفية عند فتح التطبيق
      Storage.syncWithServer();
  }

  // (نفس كود التهيئة القديم)
  if (!localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEYS)) {
    Storage.set(CONFIG.STORAGE_KEYS.API_KEYS, { Google: [], OpenAI: [], Together: [], Gemini: [] });
  }
  if (!localStorage.getItem(CONFIG.STORAGE_KEYS.GLOSSARY)) {
    Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY, { manual_terms: {}, extracted_terms: {} });
  }
  // ... باقي التهيئة
}

initializeApp();