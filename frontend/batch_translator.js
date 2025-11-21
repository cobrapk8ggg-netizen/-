// batch_translator.js - منطق الترجمة الجماعية (Async)

class BatchTranslator {
  constructor() {
    this.currentProvider = 'Gemini';
    this.isTranslating = false;
    this.stopRequested = false;
    this.currentGlossaryKeyIndex = 0;
    this.failedGlossaryKeys = new Set();

    this.initializeElements();
    this.attachEventListeners();
    
    // التهيئة غير المتزامنة
    this.initData();
  }

  async initData() {
      this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || {};
      this.glossaryKeys = await this.loadGlossaryKeys();
      this.updateInfo();
      this.updateGlossaryKeysField();
      this.toggleGlossaryKeysSection();
  }

  initializeElements() {
    this.segments = document.querySelectorAll('.segment');
    this.waitTimeField = document.getElementById('waitTimeField');
    this.glossaryKeysField = document.getElementById('glossaryKeysField');
    this.skipTranslatedSwitch = document.getElementById('skipTranslatedSwitch');
    this.extractTermsSwitch = document.getElementById('extractTermsSwitch');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.saveGlossaryKeysBtn = document.getElementById('saveGlossaryKeysBtn');
    this.infoLabel = document.getElementById('infoLabel');
    this.glossaryKeysCount = document.getElementById('glossaryKeysCount');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.progressLabel = document.getElementById('progressLabel');
    this.logOutput = document.getElementById('logOutput');
    this.glossaryKeysSection = document.getElementById('glossaryKeysSection');
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmTitle = document.getElementById('confirmTitle');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.confirmYes = document.getElementById('confirmYes');
    this.confirmNo = document.getElementById('confirmNo');
    this.toast = document.getElementById('toast');
  }

  attachEventListeners() {
    this.segments.forEach(segment => {
      segment.addEventListener('click', () => this.selectProvider(segment));
    });
    this.extractTermsSwitch.addEventListener('change', () => this.toggleGlossaryKeysSection());
    this.saveGlossaryKeysBtn.addEventListener('click', () => this.saveGlossaryKeysAction());
    this.startBtn.addEventListener('click', () => this.startBatchTranslation());
    this.stopBtn.addEventListener('click', () => this.stopTranslation());
    this.confirmModal.addEventListener('click', (e) => {
      if (e.target === this.confirmModal) this.hideConfirmModal();
    });
  }

  selectProvider(segment) {
    this.segments.forEach(s => s.classList.remove('active'));
    segment.classList.add('active');
    this.currentProvider = segment.dataset.provider;
    this.updateInfo();
  }

  async loadGlossaryKeys() {
    const stored = await Storage.get(CONFIG.STORAGE_KEYS.GLOSSARY_KEYS);
    if (!stored) {
      const defaultKeys = { Gemini: [] };
      await Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY_KEYS, defaultKeys);
      return defaultKeys;
    }
    if (!stored.Gemini) {
      stored.Gemini = [];
    } else if (typeof stored.Gemini === 'string') {
      stored.Gemini = stored.Gemini ? [stored.Gemini] : [];
    }
    return stored;
  }

  async saveGlossaryKeysToStorage(keys) {
    await Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY_KEYS, keys);
  }

  updateGlossaryKeysField() {
    if (!this.glossaryKeys) return;
    const keys = this.glossaryKeys.Gemini || [];
    this.glossaryKeysField.value = keys.join('\n');
    this.glossaryKeysCount.textContent = `🔑 ${keys.length} مفتاح للمسرد`;
  }

  async saveGlossaryKeysAction() {
    const keysText = this.glossaryKeysField.value.trim();
    const keysList = keysText ? keysText.split('\n').map(k => k.trim()).filter(k => k) : [];

    if (!this.glossaryKeys) this.glossaryKeys = { Gemini: [] };
    this.glossaryKeys.Gemini = keysList;
    
    await this.saveGlossaryKeysToStorage(this.glossaryKeys);

    this.glossaryKeysCount.textContent = `🔑 ${keysList.length} مفتاح للمسرد`;
    this.showToast(`✅ تم حفظ ${keysList.length} مفتاح للمسرد`, 'success');
    this.updateInfo();
  }

  toggleGlossaryKeysSection() {
    const enabled = this.extractTermsSwitch.checked;
    if (enabled) {
      this.glossaryKeysSection.classList.remove('hidden');
    } else {
      this.glossaryKeysSection.classList.add('hidden');
    }
  }

  async updateInfo() {
    if (!this.apiKeys) this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || {};
    const keysCount = (this.apiKeys[this.currentProvider] || []).length;
    
    if (!this.glossaryKeys) this.glossaryKeys = await this.loadGlossaryKeys();
    const glossaryKeysCount = (this.glossaryKeys.Gemini || []).length;

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

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentText = this.logOutput.value;
    this.logOutput.value = `[${timestamp}] ${message}\n${currentText}`;
  }

  async startBatchTranslation() {
    if (this.isTranslating) {
      this.showToast('⚠️ الترجمة جارية بالفعل!', 'warning');
      return;
    }

    // تحديث المفاتيح قبل البدء
    this.apiKeys = await Storage.get(CONFIG.STORAGE_KEYS.API_KEYS) || {};
    const keys = this.apiKeys[this.currentProvider] || [];

    if (keys.length === 0 && this.currentProvider !== 'Google') {
      this.showToast(`❌ يرجى إضافة مفاتيح API لـ ${this.currentProvider} أولاً`, 'error');
      return;
    }

    const extractTerms = this.extractTermsSwitch.checked;
    
    this.glossaryKeys = await this.loadGlossaryKeys();
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

  stopTranslation() {
    this.stopRequested = true;
    this.addLog('🛑 تم طلب إيقاف الترجمة...');
  }

  async runBatchTranslation(provider, keys, geminiKeys, chapters, waitTime, skipTranslated, extractTerms) {
    try {
      let glossary = await loadGlossary();
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

        if (skipTranslated) {
          const translatedChapters = await listTranslatedChapters();
          if (translatedChapters.includes(chapterFile)) {
            this.addLog(`⏭️ تخطي ${chapterName} (مترجم مسبقًا)`);
            skipped++;
            continue;
          }
        }

        this.addLog(`📥 قراءة ${chapterName}...`);
        const englishText = await readEnglishChapter(chapterFile);

        if (!englishText) {
          this.addLog(`❌ فشل قراءة ${chapterName}`);
          failed++;
          continue;
        }

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
              await saveTranslatedChapter(chapterFile, result);
              this.addLog(`✅ تم ترجمة وحفظ ${chapterName}`);
              translated++;

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
                  // تحديث المسرد المحلي
                  glossary = await loadGlossary();
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

        if (i < chapters.length - 1 && !this.stopRequested && result !== null) {
          this.addLog(`⏳ انتظار ${waitTime} ثانية...`);
          await this.sleep(waitTime * 1000);
        }
      }

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

  async extractTermsForChapter(englishText, arabicText, geminiKeys, currentGlossary, chapterName) {
    let termExtracted = false;
    let termAttempts = 0;
    const maxTermAttempts = geminiKeys.length;

    while (!termExtracted && termAttempts < maxTermAttempts && !this.stopRequested) {
      const geminiKey = geminiKeys[this.currentGlossaryKeyIndex % geminiKeys.length];

      try {
        const extractionResult = await extractTermsWithGemini(
          englishText,
          arabicText,
          geminiKey,
          currentGlossary
        );

        if (extractionResult && extractionResult.glossary) {
          await saveGlossary(extractionResult.glossary);
          termExtracted = true;
          this.addLog('✅ تم استخراج المصطلحات بنجاح.');
        } else {
          this.failedGlossaryKeys.add(geminiKey);
          this.currentGlossaryKeyIndex++;
          termAttempts++;
        }
      } catch (error) {
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

  finishTranslation() {
    this.isTranslating = false;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.loadingIndicator.style.display = 'none';
    this.progressLabel.textContent = '✅ اكتملت الترجمة!';
    this.showToast('🎉 انتهت الترجمة الجماعية!', 'success');
    this.updateInfo();
  }

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

document.addEventListener('DOMContentLoaded', () => {
  new BatchTranslator();
});
