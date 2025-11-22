// app.js - منطق التطبيق الرئيسي

class ZeusTranslator {
  constructor() {
    this.currentProvider = 'Gemini';
    
    // تهيئة مبدئية فارغة لتجنب الأخطاء قبل تحميل البيانات
    this.apiKeys = { Gemini: [], Together: [], OpenAI: [], Google: [] };
    this.currentKeyIndices = { Gemini: 0, Together: 0, OpenAI: 0, Google: 0 };
    this.failedKeys = { Gemini: [], Together: [], OpenAI: [], Google: [] };

    this.initializeElements();
    this.attachEventListeners();
    
    // بدء تحميل البيانات من قاعدة البيانات (بشكل غير متزامن)
    this.initData();
  }

  // ====== دالة جديدة لتهيئة البيانات (IndexedDB) ======
  async initData() {
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    this.currentKeyIndices = await Storage.get(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES) || this.currentKeyIndices;
    this.failedKeys = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS) || this.failedKeys;
    
    this.updateAPIKeyField();
  }

  // ====== تهيئة العناصر ======

  initializeElements() {
    // التحكم بالمزود
    this.segments = document.querySelectorAll('.segment');

    // حقول الإدخال
    this.apiKeysField = document.getElementById('apiKeysField');
    this.chapterNameField = document.getElementById('chapterNameField');
    this.englishInput = document.getElementById('englishInput');
    this.arabicOutput = document.getElementById('arabicOutput');
    this.extractedTermsOutput = document.getElementById('extractedTermsOutput');

    // الأزرار
    this.saveKeysBtn = document.getElementById('saveKeysBtn');
    this.testApiBtn = document.getElementById('testApiBtn');
    this.loadChapterBtn = document.getElementById('loadChapterBtn');
    this.translateBtn = document.getElementById('translateBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.extractTermsBtn = document.getElementById('extractTermsBtn');

    // عناصر الحالة
    this.keysCount = document.getElementById('keysCount');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.statusText = document.getElementById('statusText');

    // المودال
    this.modal = document.getElementById('chapterModal');
    this.modalClose = document.querySelector('.modal-close');
    this.chapterSearch = document.getElementById('chapterSearch');
    this.chapterList = document.getElementById('chapterList');

    // الإشعارات
    this.toast = document.getElementById('toast');
  }

  // ====== ربط الأحداث ======

  attachEventListeners() {
    // اختيار المزود
    this.segments.forEach(segment => {
      segment.addEventListener('click', () => this.selectProvider(segment));
    });

    // أزرار المفاتيح
    this.saveKeysBtn.addEventListener('click', () => this.saveAPIKeys());
    this.testApiBtn.addEventListener('click', () => this.testAPIKey());

    // زر تحميل الفصل
    this.loadChapterBtn.addEventListener('click', () => this.showChapterModal());

    // زر الترجمة
    this.translateBtn.addEventListener('click', () => this.startTranslation());

    // زر النسخ
    this.copyBtn.addEventListener('click', () => this.copyTranslation());

    // زر استخراج المصطلحات
    this.extractTermsBtn.addEventListener('click', () => this.startTermExtraction());

    // المودال
    this.modalClose.addEventListener('click', () => this.hideChapterModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hideChapterModal();
    });

    // بحث الفصول
    this.chapterSearch.addEventListener('input', (e) => this.filterChapters(e.target.value));

    // منع الإرسال عند Enter في حقل اسم الفصل
    this.chapterNameField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
  }

  // ====== إدارة المزود ======

  selectProvider(segment) {
    this.segments.forEach(s => s.classList.remove('active'));
    segment.classList.add('active');
    this.currentProvider = segment.dataset.provider;
    this.updateAPIKeyField();
  }

  // ====== إدارة المفاتيح ======

  updateAPIKeyField() {
    const keys = this.apiKeys[this.currentProvider] || [];
    this.apiKeysField.value = keys.join('\n');
    this.keysCount.textContent = `🔑 ${keys.length} مفتاح`;
  }

  async saveAPIKeys() {
    const keysText = this.apiKeysField.value.trim();
    const keysList = keysText ? keysText.split('\n').map(k => k.trim()).filter(k => k) : [];

    this.apiKeys[this.currentProvider] = keysList;
    await Storage.set(CONFIG.STORAGE_KEYS.API_KEYS, this.apiKeys);

    this.keysCount.textContent = `🔑 ${keysList.length} مفتاح`;
    this.showToast(`✅ تم حفظ ${keysList.length} مفتاح لـ ${this.currentProvider}`, 'success');
  }

  async getNextAPIKey(provider) {
    // تحديث المفاتيح من التخزين للتأكد
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    
    const keys = this.apiKeys[provider] || [];
    if (keys.length === 0) return null;

    // تحديث المفاتيح الفاشلة
    this.failedKeys = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS) || this.failedKeys;
    const failed = this.failedKeys[provider] || [];
    const availableKeys = keys.filter(k => !failed.includes(k));

    if (availableKeys.length === 0) {
      this.failedKeys[provider] = [];
      await Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, this.failedKeys);
      return keys[0];
    }

    this.currentKeyIndices = await Storage.get(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES) || this.currentKeyIndices;
    const index = this.currentKeyIndices[provider] || 0;
    const key = keys[index % keys.length];

    this.currentKeyIndices[provider] = (index + 1) % keys.length;
    await Storage.set(CONFIG.STORAGE_KEYS.CURRENT_KEY_INDICES, this.currentKeyIndices);

    return key;
  }

  async markKeyAsFailed(provider, key) {
    this.failedKeys = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS) || this.failedKeys;
    
    if (!this.failedKeys[provider]) {
      this.failedKeys[provider] = [];
    }
    if (!this.failedKeys[provider].includes(key)) {
      this.failedKeys[provider].push(key);
      await Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, this.failedKeys);
    }
  }

  async testAPIKey() {
    // تحديث المفاتيح
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    const keys = this.apiKeys[this.currentProvider] || [];

    if (keys.length === 0) {
      this.showToast('❌ يرجى إضافة مفتاح API واحد على الأقل للاختبار', 'error');
      return;
    }

    const apiKey = keys[0];
    const testText = 'test';

    this.toggleUI(false);
    this.showLoading(`جاري اختبار مفتاح ${this.currentProvider}...`);

    try {
      let result;

      if (this.currentProvider === 'Google') {
        this.showToast('⚠️ لا يوجد اختبار API مدمج لـ Google Translate حالياً', 'warning');
        return;
      } else if (this.currentProvider === 'OpenAI') {
        result = await translateWithOpenAI(testText, {}, apiKey);
      } else if (this.currentProvider === 'Together') {
        result = await translateWithTogether(testText, {}, apiKey);
      } else if (this.currentProvider === 'Gemini') {
        result = await translateWithGemini(testText, {}, apiKey);
      }

      if (result && !result.toLowerCase().includes('error')) {
        this.showToast(`✅ مفتاح ${this.currentProvider} يعمل بشكل صحيح`, 'success');
      } else {
        this.showToast(`❌ مفتاح ${this.currentProvider} غير صالح أو حدث خطأ`, 'error');
      }
    } catch (error) {
      this.showToast(`❌ حدث خطأ أثناء اختبار ${this.currentProvider}: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
      this.toggleUI(true);
    }
  }

  // ====== إدارة الفصول ======

  async showChapterModal() {
    // استخدام async/await لجلب الفصول
    const chapters = await listEnglishChapters();

    if (chapters.length === 0) {
      this.showToast('⚠️ لا توجد فصول انجليزية محفوظة', 'warning');
      return;
    }

    this.populateChapterList(chapters);
    this.modal.style.display = 'block';
  }

  hideChapterModal() {
    this.modal.style.display = 'none';
    this.chapterSearch.value = '';
  }

  populateChapterList(chapters) {
    this.chapterList.innerHTML = '';

    chapters.forEach(chapter => {
      const li = document.createElement('li');
      li.textContent = chapter;
      // loadChapter is async, but event listener handles promise return implicitly
      li.addEventListener('click', () => this.loadChapter(chapter));
      this.chapterList.appendChild(li);
    });
  }

  async filterChapters(searchText) {
    const allChapters = await listEnglishChapters();
    const filtered = allChapters.filter(ch =>
      ch.toLowerCase().includes(searchText.toLowerCase())
    );
    this.populateChapterList(filtered);
  }

  async loadChapter(chapterName) {
    // استخدام async/await لقراءة الفصل
    const content = await readEnglishChapter(chapterName);

    if (!content) {
      this.showToast(`❌ فشل تحميل الفصل ${chapterName}`, 'error');
      return;
    }

    const nameWithoutExt = chapterName.replace('.txt', '');
    this.chapterNameField.value = nameWithoutExt;
    this.englishInput.value = content;
    this.arabicOutput.value = '';

    this.hideChapterModal();
    this.showToast(`✅ تم تحميل ${nameWithoutExt}`, 'success');
  }

  // ====== الترجمة ======

  async startTranslation() {
    const chapterName = this.chapterNameField.value.trim();
    const englishText = this.englishInput.value.trim();
    
    // تحميل المسرد بشكل غير متزامن
    const glossary = await loadGlossary();

    if (!chapterName || !englishText) {
      this.showToast('❌ يرجى إدخال اسم الفصل والنص الإنجليزي', 'error');
      return;
    }

    // تأكد من تحميل المفاتيح
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    const keys = this.apiKeys[this.currentProvider] || [];
    
    if (keys.length === 0 && this.currentProvider !== 'Google') {
      this.showToast(`❌ يرجى إضافة مفتاح API واحد على الأقل لـ ${this.currentProvider}`, 'error');
      return;
    }

    this.toggleUI(false);
    this.showLoading(`جاري ترجمة الفصل باستخدام ${this.currentProvider}...`);

    // إعادة تعيين المفاتيح الفاشلة
    this.failedKeys[this.currentProvider] = [];
    await Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, this.failedKeys);

    try {
      let result = null;
      let attempts = 0;

      if (this.currentProvider === 'Google') {
        result = await translateWithGoogle(englishText);
      } else {
        while (!result && attempts < CONFIG.MAX_KEY_ATTEMPTS) {
          // جلب المفتاح بشكل غير متزامن
          const apiKey = await this.getNextAPIKey(this.currentProvider);

          if (!apiKey) break;

          const keyDisplay = apiKey.substring(0, 8) + '...';
          this.showLoading(`محاولة ${attempts + 1} - مفتاح: ${keyDisplay}`);

          try {
            if (this.currentProvider === 'OpenAI') {
              result = await translateWithOpenAI(englishText, glossary, apiKey);
            } else if (this.currentProvider === 'Together') {
              result = await translateWithTogether(englishText, glossary, apiKey);
            } else if (this.currentProvider === 'Gemini') {
              result = await translateWithGemini(englishText, glossary, apiKey);
            }

            if (!result || result.toLowerCase().includes('error')) {
              await this.markKeyAsFailed(this.currentProvider, apiKey);
              result = null;
            }
          } catch (error) {
            await this.markKeyAsFailed(this.currentProvider, apiKey);
            result = null;
          }

          attempts++;

          const failed = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS) || {};
          const failedCount = failed[this.currentProvider]?.length || 0;
          if (failedCount >= keys.length) {
            this.showLoading('جميع المفاتيح فشلت');
            break;
          }
        }
      }

      if (result) {
        this.arabicOutput.value = result;
        const filename = chapterName.endsWith('.txt') ? chapterName : `${chapterName}.txt`;
        // حفظ الترجمة بشكل غير متزامن
        await saveTranslatedChapter(filename, result);
        this.showToast(`✅ تم حفظ ${filename}`, 'success');
      } else {
        this.showToast('❌ فشل الترجمة - لم يتم الحصول على نتيجة من المزود', 'error');
      }
    } catch (error) {
      this.showToast(`❌ حدث خطأ: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
      this.toggleUI(true);
    }
  }

  // ====== نسخ الترجمة ======

  async copyTranslation() {
    const text = this.arabicOutput.value;

    if (!text) {
      this.showToast('⚠️ لا يوجد نص للنسخ', 'warning');
      return;
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showToast('✅ تم نسخ الترجمة!', 'success');
    } catch (error) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('✅ تم نسخ الترجمة!', 'success');
        } catch (err) {
            this.showToast('❌ فشل النسخ', 'error');
        }
    }
  }

  // ====== استخراج المصطلحات ======

  async startTermExtraction() {
    const englishText = this.englishInput.value.trim();
    const arabicText = this.arabicOutput.value.trim();
    
    // تأكد من تحميل المفاتيح
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    const geminiKeys = this.apiKeys['Gemini'] || [];

    if (!englishText || !arabicText) {
      this.showToast('❌ يرجى إدخال كل من النص الإنجليزي والنص العربي المترجم', 'error');
      return;
    }

    if (geminiKeys.length === 0) {
      this.showToast('❌ يرجى إضافة مفتاح API واحد على الأقل لـ Gemini لاستخدام هذه الميزة', 'error');
      return;
    }

    this.toggleUI(false);
    this.showLoading('جاري استخراج المصطلحات...');

    // إعادة تعيين المفاتيح الفاشلة
    this.failedKeys['Gemini'] = [];
    await Storage.set(CONFIG.STORAGE_KEYS.FAILED_KEYS, this.failedKeys);

    try {
      // تحميل المسرد بشكل غير متزامن
      const currentGlossary = await loadGlossary();
      
      let extractionResult = null;
      let attempts = 0;

      while (!extractionResult && attempts < CONFIG.MAX_KEY_ATTEMPTS) {
        const apiKey = await this.getNextAPIKey('Gemini');

        if (!apiKey) break;

        const keyDisplay = apiKey.substring(0, 8) + '...';
        this.showLoading(`محاولة ${attempts + 1} - مفتاح: ${keyDisplay}`);

        try {
          extractionResult = await extractTermsWithGemini(
            englishText,
            arabicText,
            apiKey,
            currentGlossary
          );
        } catch (error) {
          await this.markKeyAsFailed('Gemini', apiKey);
          extractionResult = null;
        }

        attempts++;

        const failed = await Storage.get(CONFIG.STORAGE_KEYS.FAILED_KEYS) || {};
        const failedCount = failed['Gemini']?.length || 0;
        if (failedCount >= geminiKeys.length) {
          this.showLoading('جميع مفاتيح Gemini فشلت');
          break;
        }
      }

      if (extractionResult) {
        // حفظ المسرد بشكل غير متزامن
        await saveGlossary(extractionResult.glossary);

        const newTermsCount = Object.keys(extractionResult.newTerms).length;
        const totalExtractedCount = Object.keys(extractionResult.glossary.extracted_terms).length;

        this.extractedTermsOutput.value = JSON.stringify(extractionResult.newTerms, null, 2);

        this.showToast(
          `✅ تم استخراج ${newTermsCount} مصطلح جديد. إجمالي المصطلحات المستخرجة: ${totalExtractedCount}`,
          'success'
        );
      } else {
        this.extractedTermsOutput.value = 'لا توجد مصطلحات جديدة';
        this.showToast('❌ فشل استخراج المصطلحات. تحقق من مفاتيح Gemini والاتصال', 'error');
      }
    } catch (error) {
      this.showToast(`❌ حدث خطأ أثناء استخراج المصطلحات: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
      this.toggleUI(true);
    }
  }

  // ====== مساعدات الواجهة ======

  toggleUI(enabled) {
    const elements = [
      this.saveKeysBtn,
      this.testApiBtn,
      this.loadChapterBtn,
      this.translateBtn,
      this.copyBtn,
      this.extractTermsBtn,
      this.apiKeysField,
      this.chapterNameField,
      this.englishInput
    ];

    elements.forEach(el => el.disabled = !enabled);
    this.segments.forEach(s => s.style.pointerEvents = enabled ? 'auto' : 'none');
  }

  showLoading(message) {
    this.statusText.textContent = message;
    this.loadingIndicator.style.display = 'block';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
    this.statusText.textContent = '';
  }

  showToast(message, type = 'success') {
    this.toast.textContent = message;
    this.toast.className = 'toast show';

    if (type === 'error') {
      this.toast.classList.add('error');
    } else if (type === 'warning') {
      this.toast.classList.add('warning');
    }

    setTimeout(() => {
      this.toast.classList.remove('show');
      setTimeout(() => {
        this.toast.className = 'toast';
      }, 500);
    }, 3000);
  }
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', () => {
  new ZeusTranslator();
});
