// config.js - إعدادات المسارات والثوابت مع دعم قاعدة بيانات IndexedDB

// المسارات والإعدادات العامة
const CONFIG = {
  // أسماء مفاتيح التخزين
  STORAGE_KEYS: {
    API_KEYS: 'zeus_translator_api_keys',
    GLOSSARY: 'zeus_translator_glossary',
    ENGLISH_CHAPTERS: 'zeus_translator_english_chapters',
    TRANSLATED_CHAPTERS: 'zeus_translator_translated_chapters',
    CURRENT_KEY_INDICES: 'zeus_translator_key_indices',
    FAILED_KEYS: 'zeus_translator_failed_keys',
    PROMPT_TRANSLATE: 'zeus_translator_prompt_translate',
    PROMPT_EXTRACT: 'zeus_translator_prompt_extract'
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
    Gemini: 'gemini-1.5-pro', // تم تعديلها للنسخة المستقرة المتاحة حالياً، يمكنك إعادتها لـ 2.5 إذا كان لديك وصول
    GeminiFlash: 'gemini-1.5-flash'
  }
};

// --- إعداد قاعدة بيانات IndexedDB (لحل مشكلة المساحة) ---
const DB_NAME = 'ZeusTranslatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

// إنشاء اتصال بقاعدة البيانات
const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

// دوال مساعدة للتخزين (محدثة لتكون Asynchronous)
const Storage = {
  // جلب بيانات (مع دعم الهجرة من LocalStorage القديم)
  get: async (key, defaultValue = null) => {
    try {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = async () => {
            // إذا لم توجد بيانات في قاعدة البيانات الجديدة
            if (request.result === undefined) {
                // نحاول البحث في LocalStorage القديم (للحفاظ على بياناتك السابقة)
                const localData = localStorage.getItem(key);
                if (localData) {
                    try {
                        const parsed = JSON.parse(localData);
                        // نقوم بنقلها للقاعدة الجديدة فوراً
                        await Storage.set(key, parsed); 
                        resolve(parsed);
                    } catch(e) { 
                        resolve(defaultValue); 
                    }
                } else {
                    resolve(defaultValue);
                }
            } else {
                resolve(request.result);
            }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('IndexedDB Get Error:', e);
      return defaultValue;
    }
  },

  // حفظ بيانات
  set: async (key, value) => {
    try {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(false);
      });
    } catch (e) {
      console.error('IndexedDB Set Error:', e);
      return false;
    }
  },

  // حذف بيانات
  remove: async (key) => {
      try {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            
            tx.oncomplete = () => {
                // نحذف أيضاً من LocalStorage لضمان التنظيف
                localStorage.removeItem(key);
                resolve(true);
            };
            tx.onerror = () => reject(false);
        });
      } catch (e) {
          console.error('IndexedDB Remove Error:', e);
          return false;
      }
  },

  // مسح كل البيانات
  clear: async () => {
      try {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            
            tx.oncomplete = () => {
                localStorage.clear();
                resolve(true);
            };
            tx.onerror = () => reject(false);
        });
      } catch (e) {
          console.error('IndexedDB Clear Error:', e);
          return false;
      }
  }
};

// تهيئة البيانات الافتراضية (محدثة لتكون async)
async function initializeStorage() {
  // مفاتيح API
  const apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS);
  if (!apiKeys) {
    await Storage.set(CONFIG.STORAGE_KEYS.API_KEYS, {
      Google: [],
      OpenAI: [],
      Together: [],
      Gemini: []
    });
  }

  // المسرد
  const glossary = await Storage.get(CONFIG.STORAGE_KEYS.GLOSSARY);
  if (!glossary) {
    await Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY, {
      manual_terms: {},
      extracted_terms: {}
    });
  }

  // الفصول الإنجليزية
  const engChapters = await Storage.get(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS);
  if (!engChapters) {
    await Storage.set(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS, {});
  }

  // الفصول المترجمة
  const transChapters = await Storage.get(CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS);
  if (!transChapters) {
    await Storage.set(CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS, {});
  }

  // مؤشرات المفاتيح الحالية
  const keyIndices = await Storage.get(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES);
  if (!keyIndices) {
    await Storage.set(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES, {
      Google: 0,
      OpenAI: 0,
      Together: 0,
      Gemini: 0
    });
  }

  // المفاتيح الفاشلة
  const failedKeys = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS);
  if (!failedKeys) {
    await Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, {
      Google: [],
      OpenAI: [],
      Together: [],
      Gemini: []
    });
  }
}

// تهيئة التخزين عند تحميل الصفحة
initializeStorage();
