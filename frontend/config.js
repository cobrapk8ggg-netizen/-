// config.js - إعدادات مع دعم IndexedDB (تخزين غير محدود)

const CONFIG = {
  STORAGE_KEYS: {
    API_KEYS: 'zeus_translator_api_keys',
    GLOSSARY: 'zeus_translator_glossary',
    ENGLISH_CHAPTERS: 'zeus_translator_english_chapters',
    TRANSLATED_CHAPTERS: 'zeus_translator_translated_chapters',
    CURRENT_KEY_INDICES: 'zeus_translator_key_indices',
    FAILED_KEYS: 'zeus_translator_failed_keys',
    PROMPT_TRANSLATE: 'zeus_translator_prompt_translate',
    PROMPT_EXTRACT: 'zeus_translator_prompt_extract',
    GLOSSARY_KEYS: 'zeus_translator_glossary_keys'
  },
  DEFAULT_TIMEOUT: 120,
  MAX_KEY_ATTEMPTS: 10,
  PROVIDERS: ['Google', 'OpenAI', 'Together', 'Gemini'],
  MODELS: {
    OpenAI: 'gpt-3.5-turbo',
    Together: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    Gemini: 'gemini-1.5-pro',
    GeminiFlash: 'gemini-1.5-flash'
  }
};

// --- نظام تخزين IndexedDB ---
const DB_NAME = 'ZeusTranslatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

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

const Storage = {
  get: async (key, defaultValue = null) => {
    try {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
            if (request.result === undefined) {
                // محاولة الهجرة من LocalStorage إذا لم توجد بيانات في DB
                const localData = localStorage.getItem(key);
                if (localData) {
                    try {
                        const parsed = JSON.parse(localData);
                        // نقوم بنقله لل DB للمستقبل
                        Storage.set(key, parsed); 
                        resolve(parsed);
                    } catch(e) { resolve(defaultValue); }
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
  
  remove: async (key) => {
      const db = await dbPromise;
      return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(key);
          tx.oncomplete = () => resolve(true);
      });
  },

  clear: async () => {
      const db = await dbPromise;
      return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = () => resolve(true);
      });
  }
};

// دالة تهيئة (لضمان وجود الهياكل الأساسية)
async function initializeStorage() {
    const apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS);
    if (!apiKeys) {
        await Storage.set(CONFIG.STORAGE_KEYS.API_KEYS, {
            Google: [], OpenAI: [], Together: [], Gemini: []
        });
    }
}
// بدء التهيئة في الخلفية
initializeStorage();
