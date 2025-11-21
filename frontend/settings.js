// settings.js - منطق صفحة الإعدادات (Async)

const DEFAULT_TRANSLATION_PROMPT = `
أريدك أن تترجم هذا الفصل بأسلوب عربي فصيح وأدبي متقن... (نفس البرومبت الأصلي)...
{{GLOSSARY}}
النص المطلوب ترجمته:
"""{{TEXT}}"""
`;

const DEFAULT_EXTRACTION_PROMPT = `
أنت مساعد خبير في استخراج المصطلحات... (نفس البرومبت الأصلي)...
النص الإنجليزي:
"""{{ENGLISH_TEXT}}"""
النص العربي:
"""{{ARABIC_TEXT}}"""
الآن، قدم المصطلحات المستخرجة بتنسيق JSON:
`;

document.addEventListener('DOMContentLoaded', () => {
    
    const variableOverlay = {
        token: function(stream) {
            if (stream.match(/\{\{.*?\}\}/)) {
                return "variable-template";
            }
            while (stream.next() != null && !stream.match(/\{\{.*?\}\}/, false)) {}
            return null;
        }
    };

    const cmTranslateEditor = CodeMirror.fromTextArea(document.getElementById('translatePromptField'), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "text/plain",
        direction: "rtl",
        styleActiveLine: true
    });
    cmTranslateEditor.addOverlay(variableOverlay);

    const cmExtractEditor = CodeMirror.fromTextArea(document.getElementById('extractPromptField'), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "text/plain",
        direction: "rtl",
        styleActiveLine: true
    });
    cmExtractEditor.addOverlay(variableOverlay);
    
    const saveBtn = document.getElementById('saveBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    const toast = document.getElementById('toast');

    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'error') toast.classList.add('error');
        if (type === 'warning') toast.classList.add('warning');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.className = 'toast'; }, 500);
        }, 3000);
    }

    async function loadPrompts() {
        const savedTranslate = await Storage.get(CONFIG.STORAGE_KEYS.PROMPT_TRANSLATE);
        const savedExtract = await Storage.get(CONFIG.STORAGE_KEYS.PROMPT_EXTRACT);

        cmTranslateEditor.setValue(savedTranslate || DEFAULT_TRANSLATION_PROMPT);
        cmExtractEditor.setValue(savedExtract || DEFAULT_EXTRACTION_PROMPT);
    }

    async function savePrompts() {
        const newTranslate = cmTranslateEditor.getValue();
        const newExtract = cmExtractEditor.getValue();

        if (!newTranslate.includes('{{TEXT}}') || !newTranslate.includes('{{GLOSSARY}}')) {
            showToast('❌ خطأ: برومبت الترجمة يجب أن يحتوي على {{TEXT}} و {{GLOSSARY}}', 'error');
            return;
        }

        if (!newExtract.includes('{{ENGLISH_TEXT}}') || !newExtract.includes('{{ARABIC_TEXT}}')) {
            showToast('❌ خطأ: برومبت الاستخراج يجب أن يحتوي على {{ENGLISH_TEXT}} و {{ARABIC_TEXT}}', 'error');
            return;
        }

        await Storage.set(CONFIG.STORAGE_KEYS.PROMPT_TRANSLATE, newTranslate);
        await Storage.set(CONFIG.STORAGE_KEYS.PROMPT_EXTRACT, newExtract);

        showToast('✅ تم حفظ الإعدادات بنجاح!', 'success');
    }

    async function restoreDefaults() {
        if (confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات الافتراضية؟ سيتم حذف أي تعديلات قمت بها.')) {
            await Storage.remove(CONFIG.STORAGE_KEYS.PROMPT_TRANSLATE);
            await Storage.remove(CONFIG.STORAGE_KEYS.PROMPT_EXTRACT);
            
            await loadPrompts();
            
            showToast('♻️ تم استعادة الإعدادات الافتراضية', 'success');
        }
    }

    saveBtn.addEventListener('click', savePrompts);
    restoreBtn.addEventListener('click', restoreDefaults);

    loadPrompts();
});
