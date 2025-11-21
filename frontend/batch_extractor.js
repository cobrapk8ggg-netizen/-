// batch_extractor.js - منطق استخراج المصطلحات الجماعي (Async)

class BatchExtractor {
  constructor() {
    this.isExtracting = false;
    this.stopRequested = false;
    this.currentGlossaryKeyIndex = 0;
    this.failedGlossaryKeys = new Set();

    this.initializeElements();
    this.attachEventListeners();
    
    // تهيئة غير متزامنة
    this.initData();
  }

  async initData() {
      this.glossaryKeys = await this.loadGlossaryKeys();
      this.updateGlossaryKeysField(); 
      this.updateInfo();
  }

  initializeElements() {
    this.waitTimeField = document.getElementById('waitTimeField');
    this.glossaryKeysField = document.getElementById('glossaryKeysField');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.saveGlossaryKeysBtn = document.getElementById('saveGlossaryKeysBtn');
    this.infoLabel = document.getElementById('infoLabel');
    this.glossaryKeysCount = document.getElementById('glossaryKeysCount');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.progressLabel = document.getElementById('progressLabel');
    this.logOutput = document.getElementById('logOutput');
    this.toast = document.getElementById('toast');
  }

  attachEventListeners() {
    this.saveGlossaryKeysBtn.addEventListener('click', () => this.saveGlossaryKeysAction());
    this.startBtn.addEventListener('click', () => this.startBatchExtraction());
    this.stopBtn.addEventListener('click', () => this.stopExtraction());
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

  async updateInfo() {
    try {
        if (!this.glossaryKeys) this.glossaryKeys = await this.loadGlossaryKeys();
        const glossaryKeysCount = (this.glossaryKeys.Gemini || []).length;
        
        const englishChapters = await listEnglishChapters();
        const translatedChapters = await listTranslatedChapters();
        
        const matchingChapters = englishChapters.filter(ch => translatedChapters.includes(ch));
        
        const currentGlossary = await loadGlossary();
        const totalTerms = Object.keys(currentGlossary.extracted_terms || {}).length;

        this.infoLabel.innerHTML = `
            <p>🔑 عدد مفاتيح المسرد: ${glossaryKeysCount}</p>
            <p>📚 عدد الفصول الإنجليزية: ${englishChapters.length}</p>
            <p>✅ عدد الفصول المترجمة: ${translatedChapters.length}</p>
            <p>🔄 فصول متطابقة (للمعالجة): ${matchingChapters.length}</p>
            <p>📖 إجمالي المصطلحات الحالية: ${totalTerms}</p>
        `;
    } catch (e) {
        console.error("Failed to update info:", e);
        this.infoLabel.innerHTML = "<p>❌ خطأ في تحميل معلومات الفصول</p>";
    }
  }

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentText = this.logOutput.value;
    this.logOutput.value = `[${timestamp}] ${message}\n${currentText}`;
    this.logOutput.scrollTop = 0; 
  }

  async startBatchExtraction() {
    if (this.isExtracting) {
      this.showToast('⚠️ الاستخراج جاري بالفعل!', 'warning');
      return;
    }

    await this.saveGlossaryKeysAction();
    const geminiKeys = this.glossaryKeys.Gemini || [];

    if (geminiKeys.length === 0) {
      this.showToast('❌ يرجى إضافة مفاتيح Gemini للمسرد أولاً', 'error');
      return;
    }

    const waitTime = parseInt(this.waitTimeField.value);
    if (isNaN(waitTime) || waitTime < 0) {
      this.showToast('❌ يرجى إدخال وقت انتظار صحيح (رقم موجب)', 'error');
      return;
    }

    const englishChapters = await listEnglishChapters();
    const translatedChapters = await listTranslatedChapters();
    const matchingChapters = englishChapters.filter(ch => translatedChapters.includes(ch));

    if (matchingChapters.length === 0) {
      this.showToast('❌ لا توجد فصول متطابقة (مترجمة) لبدء الاستخراج', 'error');
      return;
    }

    this.isExtracting = true;
    this.stopRequested = false;
    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    this.loadingIndicator.style.display = 'block';
    this.logOutput.value = '';
    this.progressLabel.textContent = '...جاري التهيئة';

    this.runBatchExtraction(geminiKeys, matchingChapters, waitTime);
  }

  stopExtraction() {
    this.stopRequested = true;
    this.addLog('🛑 تم طلب إيقاف الاستخراج...');
    this.stopBtn.disabled = true;
  }

  async runBatchExtraction(geminiKeys, chapters, waitTime) {
    try {
      let currentGlossary = await loadGlossary();
      const total = chapters.length;
      let extracted = 0;
      let failed = 0;
      let totalNewTerms = 0;

      this.failedGlossaryKeys = new Set();
      this.currentGlossaryKeyIndex = 0;

      this.addLog(`🚀 بدء استخراج المصطلحات من ${total} فصل متطابق`);

      for (let i = 0; i < chapters.length; i++) {
        if (this.stopRequested) {
          this.addLog('⛔ تم إيقاف الاستخراج بواسطة المستخدم');
          break;
        }

        const chapterFile = chapters[i];
        const chapterName = chapterFile.replace('.txt', '');

        this.progressLabel.innerHTML = `📊 التقدم: ${i + 1}/${total}<br>📖 الفصل الحالي: ${chapterName}`;

        this.addLog(`📥 قراءة ${chapterName} (إنجليزي)...`);
        const englishText = await readEnglishChapter(chapterFile);
        if (!englishText) {
          this.addLog(`❌ فشل قراءة الفصل الإنجليزي ${chapterName}`);
          failed++;
          continue;
        }

        this.addLog(`📥 قراءة ${chapterName} (عربي)...`);
        const arabicText = await readTranslatedChapter(chapterFile);
        if (!arabicText) {
          this.addLog(`❌ فشل قراءة الفصل المترجم ${chapterName}`);
          failed++;
          continue;
        }

        this.addLog(`📚 استخراج مصطلحات ${chapterName}...`);
        
        let termExtracted = false;
        let termAttempts = 0;
        const maxTermAttempts = geminiKeys.length;
        const oldTermsCount = Object.keys(currentGlossary.extracted_terms || {}).length;

        while (!termExtracted && termAttempts < maxTermAttempts && !this.stopRequested) {
          const keyIndex = this.currentGlossaryKeyIndex % geminiKeys.length;
          const geminiKey = geminiKeys[keyIndex];
          
          if (this.failedGlossaryKeys.has(geminiKey)) {
              this.currentGlossaryKeyIndex++;
              termAttempts++;
              continue;
          }

          const keyDisplay = geminiKey.substring(0, 8) + '...';
          this.addLog(`🔑 استخدام المفتاح: ${keyDisplay}`);

          try {
            const extractionResult = await extractTermsWithGemini(
              englishText,
              arabicText,
              geminiKey,
              currentGlossary
            );

            if (extractionResult && extractionResult.glossary) {
              await saveGlossary(extractionResult.glossary);
              currentGlossary = extractionResult.glossary;
              
              const newTermsCount = Object.keys(extractionResult.glossary.extracted_terms).length;
              const added = newTermsCount - oldTermsCount;

              this.addLog(`✅ تم استخراج ${added} مصطلح جديد`);
              extracted++;
              totalNewTerms += added;
              termExtracted = true;
            } else {
              throw new Error("فشل الاستخراج، نتيجة فارغة");
            }
          } catch (error) {
            console.error('خطأ في استخراج المصطلحات:', error);
            this.addLog(`⚠️ خطأ: ${error.message.substring(0, 50)}`);
            this.failedGlossaryKeys.add(geminiKey);
            this.currentGlossaryKeyIndex++;
            termAttempts++;
          }
        }

        if (!termExtracted && !this.stopRequested) {
          this.addLog(`❌ فشل استخراج مصطلحات ${chapterName} (نفدت المفاتيح)`);
          failed++;
        }

        if (i < chapters.length - 1 && !this.stopRequested) {
          this.addLog(`⏳ انتظار ${waitTime} ثانية...`);
          await this.sleep(waitTime * 1000);
        }
      }

      let summary = '\n' + '='.repeat(40) + '\n';
      summary += '📊 ملخص الاستخراج الجماعي:\n';
      summary += `✅ نجح: ${extracted}\n`;
      summary += `❌ فشل: ${failed}\n`;
      summary += `📚 الإجمالي: ${total}\n`;
      summary += `🆕 مصطلحات جديدة: ${totalNewTerms}\n`;
      summary += '='.repeat(40);

      this.addLog(summary);

    } catch (error) {
      console.error('خطأ فادح في الاستخراج الجماعي:', error);
      this.addLog(`❌ خطأ فادح: ${error.message}`);
    } finally {
      this.finishExtraction();
    }
  }

  finishExtraction() {
    this.isExtracting = false;
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.loadingIndicator.style.display = 'none';
    this.progressLabel.textContent = '✅ اكتمل الاستخراج!';
    this.showToast('🎉 انتهى الاستخراج الجماعي!', 'success');
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
}

document.addEventListener('DOMContentLoaded', () => {
  new BatchExtractor();
});
