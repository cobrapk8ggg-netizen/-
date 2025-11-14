// اسم ذاكرة التخزين المؤقت
const CACHE_NAME = 'tranZEUS-cache-v1'; // يمكنك تغيير الإصدار إلى v2 إذا أردت فرض تحديث

// قائمة الملفات الأساسية لتخزينها مؤقتًا
const urlsToCache = [
  '/',
  'index.html',
  'translator.html',
  'محرر.html',
  'glossary_editor.html',
  'batch_translator.html',
  'settings.html', // <-- إضافة جديدة
  'manifest.json',
  
  // ملفات CSS
  'style.css',
  'translator.css',
  'batch_styles.css',
  'glossary_editor.css',
  'settings_styles.css', // <-- إضافة جديدة
  
  // ملفات JS
  'config.js',
  'translator_core.js',
  'app.js',
  'batch_translator.js',
  'glossary_editor.js',
  'settings.js', // <-- إضافة جديدة
  'jszip.min.js',

  // الأيقونات
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// 1. تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // استخدام addAll لضمان تحميل كل شيء
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
          console.error('Failed to cache urlsToCache:', err);
      })
  );
});

// 2. تفعيل الـ Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName); // <-- إضافة سطر توضيحي
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. اعتراض طلبات الشبكة (Fetch)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا وجد في ذاكرة التخزين المؤقت، أعده
        if (response) {
          return response;
        }
        
        // وإلا، اطلبه من الشبكة
        // (ملاحظة: هذا يعني أن التطبيق سيعمل دون اتصال للملفات المخزنة فقط)
        return fetch(event.request).catch(err => {
            console.error('Fetch failed:', err, event.request.url);
            // يمكنك إرجاع صفحة خطأ مخصصة هنا إذا أردت
        });
      }
    )
  );
});