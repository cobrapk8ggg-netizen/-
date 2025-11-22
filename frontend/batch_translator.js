// batch_translator.js - منطق الترجمة الجماعية

class BatchTranslator {
  constructor() {
    this.currentProvider = 'Gemini';
    
    // تهيئة مبدئية فارغة لتجنب الأخطاء قبل تحميل البيانات
    this.apiKeys = { Gemini: [], Together: [], OpenAI: [], Google: [] };
    this.glossaryKeys = { Gemini: [] };
    
    this.isTranslating = false;
    this.stopRequested = false;
    this.currentGlossaryKeyIndex = 0;
    this.failedGlossaryKeys = new Set();

    this.initializeElements();
    this.attachEventListeners();
    
    // بدء تحميل البيانات من قاعدة البيانات (بشكل غير متزامن)
    this.initData();
  }

  // ====== دالة جديدة لتهيئة البيانات (IndexedDB) ======
  async initData() {
    // تحميل مفاتيح API
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || { Gemini: [], Together: [], OpenAI: [], Google: [] };
    
    // تحميل مفاتيح المسرد
    this.glossaryKeys = await this.loadGlossaryKeys();
    
    // تحديث الواجهة
    this.updateGlossaryKeysField();
    this.toggleGlossaryKeysSection();
    await this.updateInfo();
  }

  // ====== تهيئة العناصر ======

  initializeElements() {
    // التحكم بالمزود
    this.segments = document.querySelectorAll('.segment');

    // حقول الإدخال
    this.waitTimeField = document.getElementById('waitTimeField');
    this.glossaryKeysField = document.getElementById('glossaryKeysField');

    // المفاتيح
    this.skipTranslatedSwitch = document.getElementById('skipTranslatedSwitch');
    this.extractTermsSwitch = document.getElementById('extractTermsSwitch');

    // الأزرار
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.saveGlossaryKeysBtn = document.getElementById('saveGlossaryKeysBtn');

    // عناصر العرض
    this.infoLabel = document.getElementById('infoLabel');
    this.glossaryKeysCount = document.getElementById('glossaryKeysCount');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.progressLabel = document.getElementById('progressLabel');
    this.logOutput = document.getElementById('logOutput');

    // الأقسام
    this.glossaryKeysSection = document.getElementById('glossaryKeysSection');

    // المودال
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmTitle = document.getElementById('confirmTitle');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.confirmYes = document.getElementById('confirmYes');
    this.confirmNo = document.getElementById('confirmNo');

    // الإشعارات
    this.toast = document.getElementById('toast');
  }

  // ====== ربط الأحداث ======

  attachEventListeners() {
    // اختيار المزود
    this.segments.forEach(segment => {
      segment.addEventListener('click', () => this.selectProvider(segment));
    });

    // مفتاح استخراج المصطلحات
    this.extractTermsSwitch.addEventListener('change', () => this.toggleGlossaryKeysSection());

    // حفظ مفاتيح المسرد
    this.saveGlossaryKeysBtn.addEventListener('click', () => this.saveGlossaryKeysAction());

    // أزرار التحكم
    this.startBtn.addEventListener('click', () => this.startBatchTranslation());
    this.stopBtn.addEventListener('click', () => this.stopTranslation());

    // المودال
    this.confirmModal.addEventListener('click', (e) => {
      if (e.target === this.confirmModal) this.hideConfirmModal();
    });
  }

  // ====== إدارة المزود ======

  async selectProvider(segment) {
    this.segments.forEach(s => s.classList.remove('active'));
    segment.classList.add('active');
    this.currentProvider = segment.dataset.provider;
    await this.updateInfo();
  }

  // ====== إدارة مفاتيح المسرد ======

  async loadGlossaryKeys() {
    const stored = await Storage.get('zeus_translator_glossary_keys');
    if (!stored) {
      const defaultKeys = { Gemini: [] };
      await Storage.set('zeus_translator_glossary_keys', defaultKeys);
      return defaultKeys;
    }

    // التأكد من الهيكل الصحيح
    if (!stored.Gemini) {
      stored.Gemini = [];
    } else if (typeof stored.Gemini === 'string') {
      stored.Gemini = stored.Gemini ? [stored.Gemini] : [];
    }

    return stored;
  }

  async saveGlossaryKeysToStorage(keys) {
    await Storage.set('zeus_translator_glossary_keys', keys);
  }

  updateGlossaryKeysField() {
    const keys = this.glossaryKeys.Gemini || [];
    this.glossaryKeysField.value = keys.join('\n');
    this.glossaryKeysCount.textContent = `🔑 ${keys.length} مفتاح للمسرد`;
  }

  async saveGlossaryKeysAction() {
    const keysText = this.glossaryKeysField.value.trim();
    const keysList = keysText ? keysText.split('\n').map(k => k.trim()).filter(k => k) : [];

    this.glossaryKeys.Gemini = keysList;
    await this.saveGlossaryKeysToStorage(this.glossaryKeys);

    this.glossaryKeysCount.textContent = `🔑 ${keysList.length} مفتاح للمسرد`;
    this.showToast(`✅ تم حفظ ${keysList.length} مفتاح للمسرد`, 'success');
    await this.updateInfo();
  }

  toggleGlossaryKeysSection() {
    const enabled = this.extractTermsSwitch.checked;
    if (enabled) {
      this.glossaryKeysSection.classList.remove('hidden');
    } else {
      this.glossaryKeysSection.classList.add('hidden');
    }
  }

  // ====== تحديث المعلومات ======

  async updateInfo() {
    // بما أن التخزين أصبح غير متزامن، نحتاج لاستخدام await
    const keysCount = (this.apiKeys[this.currentProvider] || []).length;
    const glossaryKeysCount = (this.glossaryKeys.Gemini || []).length;

    // استخدام الدوال من translator_core.js (التي أصبحت async الآن)
    const englishChapters = await listEnglishChapters();
    const chaptersCount = englishChapters.length;

    const translatedChapters = await listTranslatedChapters();
    const translatedCount = translatedChapters.length;

    this.infoLabel.innerHTML = `
        <p>🔑 عدد المفاتيح (${this.currentProvider}): ${keysCount}</p>
        <p>🔑 عدد مفاتيح المسرد: ${glossaryKeysCount}</p>
        <p>📚 عدد الفصول الإنجليزية: ${chaptersCount}</p>
        <p>✅ عدد الفصول المترجمة: ${translatedCount}</p>
    `;
  }

  // ====== السجل ======

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentText = this.logOutput.value;
    this.logOutput.value = `[${timestamp}] ${message}\n${currentText}`;
  }

  // ====== بدء الترجمة ======

  async startBatchTranslation() {
    if (this.isTranslating) {
      this.showToast('⚠️ الترجمة جارية بالفعل!', 'warning');
      return;
    }

    // تحديث المفاتيح للتأكد من أنها الأحدث
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || this.apiKeys;
    const keys = this.apiKeys[this.currentProvider] || [];

    if (keys.length === 0 && this.currentProvider !== 'Google') {
      this.showToast(`❌ يرجى إضافة مفاتيح API لـ ${this.currentProvider} أولاً`, 'error');
      return;
    }

    const extractTerms = this.extractTermsSwitch.checked;
    const geminiKeys = this.glossaryKeys.Gemini || [];

    if (extractTerms && geminiKeys.length === 0) {
      const confirmed = await this.showConfirmModal(
        'تحذير',
        'لا توجد مفاتيح Gemini للمسرد.\nهل تريد المتابعة بدون استخراج المصطلحات؟'
      );

      if (!confirmed) return;
      this.extractTermsSwitch.checked = false;
    }

    const waitTime = parseInt(this.waitTimeField.value);
    if (isNaN(waitTime) || waitTime < 0) {
      this.showToast('❌ يرجى إدخال وقت انتظار صحيح (رقم موجب)', 'error');
      return;
    }

    const englishChapters = await listEnglishChapters();
    if (englishChapters.length === 0) {
      this.showToast('❌ لا توجد فصول إنجليزية للترجمة', 'error');
      return;
    }

    this.isTranslating = true;
    this.stopRequested = false;
    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.loadingIndicator.style.display = 'block';
    this.logOutput.value = '';

    // بدء الترجمة
    this.runBatchTranslation(
      this.currentProvider,
      keys,
      geminiKeys,
      englishChapters,
      waitTime,
      this.skipTranslatedSwitch.checked,
      this.extractTermsSwitch.checked
    );
  }

  // ====== إيقاف الترجمة ======

  stopTranslation() {
    this.stopRequested = true;
    this.addLog('🛑 تم طلب إيقاف الترجمة...');
  }

  // ====== تشغيل الترجمة الجماعية ======

  async runBatchTranslation(provider, keys, geminiKeys, chapters, waitTime, skipTranslated, extractTerms) {
    try {
      // تحميل المسرد بشكل غير متزامن
      const glossary = await loadGlossary();
      const total = chapters.length;
      let translated = 0;
      let skipped = 0;
      let failed = 0;
      let termsExtracted = 0;
      let termsFailed = 0;

      let keyIndex = 0;
      let currentKey = keys.length > 0 ? keys[keyIndex] : null;

      this.failedGlossaryKeys = new Set();
      this.currentGlossaryKeyIndex = 0;

      this.addLog(`🚀 بدء ترجمة ${total} فصل باستخدام ${provider}`);
      if (extractTerms) {
        this.addLog('📚 استخراج المصطلحات مفعّل');
      }

      for (let i = 0; i < chapters.length; i++) {
        if (this.stopRequested) {
          this.addLog('⛔ تم إيقاف الترجمة بواسطة المستخدم');
          break;
        }

        const chapterFile = chapters[i];
        const chapterName = chapterFile.replace('.txt', '');

        this.progressLabel.innerHTML = `📊 التقدم: ${i + 1}/${total}<br>📖 الفصل الحالي: ${chapterName}`;

        // تخطي المترجم
        if (skipTranslated) {
          const translatedChapters = await listTranslatedChapters();
          if (translatedChapters.includes(chapterFile)) {
            this.addLog(`⏭️ تخطي ${chapterName} (مترجم مسبقًا)`);
            skipped++;
            continue;
          }
        }

        this.addLog(`📥 قراءة ${chapterName}...`);
        // قراءة الفصل بشكل غير متزامن
        const englishText = await readEnglishChapter(chapterFile);

        if (!englishText) {
          this.addLog(`❌ فشل قراءة ${chapterName}`);
          failed++;
          continue;
        }

        // محاولة الترجمة
        let result = null;
        let attempts = 0;
        const maxAttempts = keys.length || 1;

        while (result === null && attempts < maxAttempts && !this.stopRequested) {
          if (provider !== 'Google') {
            currentKey = keys[keyIndex % keys.length];
            const keyDisplay = currentKey.substring(0, 8) + '...';
            this.addLog(`🔑 استخدام المفتاح: ${keyDisplay}`);
          }

          this.addLog(`🔄 ترجمة ${chapterName}...`);

          try {
            if (provider === 'Google') {
              result = await translateWithGoogle(englishText);
            } else if (provider === 'OpenAI') {
              result = await translateWithOpenAI(englishText, glossary, currentKey);
            } else if (provider === 'Together') {
              result = await translateWithTogether(englishText, glossary, currentKey);
            } else if (provider === 'Gemini') {
              result = await translateWithGemini(englishText, glossary, currentKey);
            }

            if (result && !result.toLowerCase().includes('error')) {
              // حفظ الفصل المترجم بشكل غير متزامن
              await saveTranslatedChapter(chapterFile, result);
              this.addLog(`✅ تم ترجمة وحفظ ${chapterName}`);
              translated++;

              // استخراج المصطلحات
              if (extractTerms && geminiKeys.length > 0 && !this.stopRequested) {
                const termResult = await this.extractTermsForChapter(
                  englishText,
                  result,
                  geminiKeys,
                  glossary,
                  chapterName
                );

                if (termResult.success) {
                  termsExtracted++;
                } else {
                  termsFailed++;
                }
              }

              break;
            } else {
              result = null;
              keyIndex++;
              attempts++;
            }
          } catch (error) {
            console.error('خطأ في الترجمة:', error);
            this.addLog(`⚠️ خطأ: ${error.message.substring(0, 50)}`);
            result = null;
            keyIndex++;
            attempts++;
          }
        }

        if (result === null) {
          this.addLog(`❌ فشلت ترجمة ${chapterName}`);
          failed++;
        }

        // انتظار بين الفصول
        if (i < chapters.length - 1 && !this.stopRequested && result !== null) {
          this.addLog(`⏳ انتظار ${waitTime} ثانية...`);
          await this.sleep(waitTime * 1000);
        }
      }

      // الملخص
      let summary = '\n' + '='.repeat(40) + '\n';
      summary += '📊 ملخص الترجمة الجماعية:\n';
      summary += `✅ نجح: ${translated}\n`;
      summary += `⏭️ تم تخطيه: ${skipped}\n`;
      summary += `❌ فشل: ${failed}\n`;
      summary += `📚 الإجمالي: ${total}\n`;
      if (extractTerms) {
        summary += '\n📚 استخراج المصطلحات:\n';
        summary += `✅ نجح: ${termsExtracted}\n`;
        summary += `❌ فشل: ${termsFailed}\n`;
      }
      summary += '='.repeat(40);

      this.addLog(summary);

    } catch (error) {
      console.error('خطأ في الترجمة الجماعية:', error);
      this.addLog(`❌ خطأ في الترجمة الجماعية: ${error.message}`);
    } finally {
      this.finishTranslation();
    }
  }

  // ====== استخراج المصطلحات لفصل واحد ======

  async extractTermsForChapter(englishText, arabicText, geminiKeys, currentGlossary, chapterName) {
    let termExtracted = false;
    let termAttempts = 0;
    const maxTermAttempts = geminiKeys.length;

    while (!termExtracted && termAttempts < maxTermAttempts && !this.stopRequested) {
      const geminiKey = geminiKeys[this.currentGlossaryKeyIndex % geminiKeys.length];

      console.log('\n--- DEBUG: Starting Term Extraction Attempt ---');
      console.log(`DEBUG: Attempt ${termAttempts + 1} for chapter: ${chapterName}`);

      try {
        console.log('DEBUG: Calling extractTermsWithGemini...');

        const extractionResult = await extractTermsWithGemini(
          englishText,
          arabicText,
          geminiKey,
          currentGlossary
        );

        console.log('DEBUG: Returned from extractTermsWithGemini');

        if (extractionResult && extractionResult.glossary) {
          console.log('DEBUG: Extraction successful, saving glossary...');

          // حفظ المسرد بشكل غير متزامن
          await saveGlossary(extractionResult.glossary);
          currentGlossary = extractionResult.glossary;

          termExtracted = true;
          this.addLog('✅ تم استخراج المصطلحات بنجاح.');

          console.log('DEBUG: Glossary saved successfully');
        } else {
          console.log('DEBUG: Extraction returned null or invalid result');
          this.failedGlossaryKeys.add(geminiKey);
          this.currentGlossaryKeyIndex++;
          termAttempts++;
        }
      } catch (error) {
        console.error('\n--- DEBUG: ERROR in term extraction ---');
        console.error(error);

        this.failedGlossaryKeys.add(geminiKey);
        this.currentGlossaryKeyIndex++;
        termAttempts++;
        this.addLog(`⚠️ خطأ استخراج: ${error.message.substring(0, 50)}`);
      }
    }

    if (!termExtracted) {
      this.addLog(`❌ فشل استخراج مصطلحات ${chapterName}`);
    }

    return { success: termExtracted };
  }

  // ====== إنهاء الترجمة ======

  finishTranslation() {
    this.isTranslating = false;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.loadingIndicator.style.display = 'none';
    this.progressLabel.textContent = '✅ اكتملت الترجمة!';
    this.showToast('🎉 انتهت الترجمة الجماعية!', 'success');
    this.updateInfo();
  }

  // ====== مساعدات ======

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showToast(message, type = 'success') {
    this.toast.textContent = message;
    this.toast.className = 'toast show';

    if (type === 'error') {
      this.toast.classList.add('error');
    } else if (type === 'warning') {
      this.toast.classList.add('warning');
    } else if (type === 'info') {
      this.toast.classList.add('info');
    }

    setTimeout(() => {
      this.toast.classList.remove('show');
      setTimeout(() => {
        this.toast.className = 'toast';
      }, 500);
    }, 3000);
  }

  showConfirmModal(title, message) {
    return new Promise((resolve) => {
      this.confirmTitle.textContent = title;
      this.confirmMessage.textContent = message;
      this.confirmModal.style.display = 'block';

      const handleYes = () => {
        this.hideConfirmModal();
        this.confirmYes.removeEventListener('click', handleYes);
        this.confirmNo.removeEventListener('click', handleNo);
        resolve(true);
      };

      const handleNo = () => {
        this.hideConfirmModal();
        this.confirmYes.removeEventListener('click', handleYes);
        this.confirmNo.removeEventListener('click', handleNo);
        resolve(false);
      };

      this.confirmYes.addEventListener('click', handleYes);
      this.confirmNo.addEventListener('click', handleNo);
    });
  }

  hideConfirmModal() {
    this.confirmModal.style.display = 'none';
  }
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', () => {
  new BatchTranslator();
});
