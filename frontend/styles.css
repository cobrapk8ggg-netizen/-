// config.js - إعدادات المسارات والثوابت

// المسارات (سيتم استخدام LocalStorage في بيئة المتصفح)
const CONFIG = {
  // أسماء مفاتيح LocalStorage
  STORAGE_KEYS: {
    API_KEYS: 'zeus_translator_api_keys',
    GLOSSARY: 'zeus_translator_glossary',
    ENGLISH_CHAPTERS: 'zeus_translator_english_chapters',
    TRANSLATED_CHAPTERS: 'zeus_translator_translated_chapters',
    CURRENT_KEY_INDICES: 'zeus_translator_key_indices',
    FAILED_KEYS: 'zeus_translator_failed_keys'
  },

  // المهلة الزمنية للطلبات (بالثواني)
  DEFAULT_TIMEOUT: 120,

  // عدد المحاولات القصوى للتبديل بين المفاتيح
  MAX_KEY_ATTEMPTS: 10,

  // المزودات المتاحة
  PROVIDERS: ['Google', 'OpenAI', 'Together', 'Gemini'],

  // نماذج المزودات
  MODELS: {
    OpenAI: 'gpt-3.5-turbo',
    Together: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    Gemini: 'gemini-2.5-pro',
    GeminiFlash: 'gemini-2.5-flash'
  }
};

// دوال مساعدة للتخزين المحلي
const Storage = {
  // حفظ بيانات
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('خطأ في حفظ البيانات:', e);
      return false;
    }
  },

  // جلب بيانات
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('خطأ في جلب البيانات:', e);
      return defaultValue;
    }
  },

  // حذف بيانات
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('خطأ في حذف البيانات:', e);
      return false;
    }
  },

  // مسح كل البيانات
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('خطأ في مسح البيانات:', e);
      return false;
    }
  }
};

// تهيئة البيانات الافتراضية
function initializeStorage() {
  // مفاتيح API
  if (!Storage.get(CONFIG.STORAGE_KEYS.API_KEYS)) {
    Storage.set(CONFIG.STORAGE_KEYS.API_KEYS, {
      Google: [],
      OpenAI: [],
      Together: [],
      Gemini: []
    });
  }

  // المسرد
  if (!Storage.get(CONFIG.STORAGE_KEYS.GLOSSARY)) {
    Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY, {
      manual_terms: {},
      extracted_terms: {}
    });
  }

  // الفصول الإنجليزية
  if (!Storage.get(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS)) {
    Storage.set(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS, {});
  }

  // الفصول المترجمة
  if (!Storage.get(CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS)) {
    Storage.set(CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS, {});
  }

  // مؤشرات المفاتيح الحالية
  if (!Storage.get(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES)) {
    Storage.set(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES, {
      Google: 0,
      OpenAI: 0,
      Together: 0,
      Gemini: 0
    });
  }

  // المفاتيح الفاشلة
  if (!Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS)) {
    Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, {
      Google: [],
      OpenAI: [],
      Together: [],
      Gemini: []
    });
  }
}

// تهيئة التخزين عند تحميل الصفحة
initializeStorage();
