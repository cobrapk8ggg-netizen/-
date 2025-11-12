// glossary_editor.js

// الانتظار حتى يتم تحميل الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. تعريف الحالة (State) العالمية ---
    let glossaryData = { manual_terms: {}, extracted_terms: {} };
    let currentDisplayedPairs = []; // لحفظ القائمة المفلترة حالياً
    let selectedKey = null;
    let selectedSource = null;

    // --- 2. جلب عناصر الصفحة (DOM Elements) ---
    const searchField = document.getElementById('searchField');
    const typeFilter = document.getElementById('typeFilter');
    const sortPicker = document.getElementById('sortPicker');
    const enTermField = document.getElementById('enTermField');
    const arTermField = document.getElementById('arTermField');
    const addBtn = document.getElementById('addBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const glossaryList = document.getElementById('glossaryList');
    const termsCount = document.getElementById('termsCount');
    const toast = document.getElementById('toast');

    // === الإضافة الجديدة هنا ===
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    // === نهاية الإضافة ===

    // --- 3. دوال مساعدة (Helpers) ---

    /**
     * دالة لعرض إشعار (مثل console.hud_alert)
     * (مستعارة من app.js الخاص بالمترجم)
     */
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

    /**
     * دالة لتحديث واجهة التحكم المقسم (Segmented Control)
     */
    function updateSegmentedControl(container, clickedButton) {
        container.querySelectorAll('.segment').forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
    }

    /**
     * دالة لتنظيف حقول الإدخال وإلغاء التحديد
     */
    function clearSelection() {
        selectedKey = null;
        selectedSource = null;
        enTermField.value = '';
        arTermField.value = '';

        // إلغاء التحديد بصرياً
        glossaryList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
    }

    // --- 4. الدوال الأساسية (Core Logic) ---

    /**
     * (مطابق لـ filter_and_sort_glossary في بايثون)
     * يقوم بفلترة وفرز وعرض القائمة
     */
    function filterAndSortGlossary() {
        // جلب القيم الحالية من الفلاتر
        const currentFilterText = searchField.value.toLowerCase();
        const currentSort = sortPicker.querySelector('.segment.active').dataset.sort;
        const currentTypeFilter = typeFilter.querySelector('.segment.active').dataset.filter;

        let allTermsWithSource = [];

        // دمج المصطلحات اليدوية (Manual)
        if (currentTypeFilter === 'all' || currentTypeFilter === 'manual') {
            for (const [key, value] of Object.entries(glossaryData.manual_terms)) {
                allTermsWithSource.push({ key, value, source: 'manual' });
            }
        }

        // دمج المصطلحات المستخرجة (Extracted)
        if (currentTypeFilter === 'all' || currentTypeFilter === 'extracted') {
            for (const [key, value] of Object.entries(glossaryData.extracted_terms)) {
                allTermsWithSource.push({ key, value, source: 'extracted' });
            }
        }

        // الفلترة بالبحث (مطابق لـ `if self.current_filter_text in key_lower...`)
        const filteredPairs = allTermsWithSource.filter(term => {
            const keyLower = term.key.toLowerCase();
            const valueLower = term.value.toLowerCase();
            return keyLower.includes(currentFilterText) || valueLower.includes(currentFilterText);
        });

        // الفرز (مطابق لـ `if self.current_sort_index == 0...`)
        if (currentSort === 'en') {
            filteredPairs.sort((a, b) => a.key.localeCompare(b.key, 'en', { sensitivity: 'base' }));
        } else if (currentSort === 'ar') {
            filteredPairs.sort((a, b) => a.value.localeCompare(b.value, 'ar', { sensitivity: 'base' }));
        }

        // حفظ الحالة لعكسها عند التحديد
        currentDisplayedPairs = filteredPairs;
        
        // عرض القائمة
        renderList(filteredPairs);
    }

    /**
     * (مطابق لـ tableview_cell_for_row في بايثون)
     * يقوم برسم القائمة في HTML
     */
    function renderList(pairs) {
        glossaryList.innerHTML = ''; // إفراغ القائمة
        termsCount.textContent = pairs.length; // تحديث العداد

        if (pairs.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'empty';
            emptyLi.textContent = '📭 لا توجد مصطلحات تطابق البحث';
            glossaryList.appendChild(emptyLi);
            return;
        }

        pairs.forEach((p, index) => {
            const li = document.createElement('li');
            li.dataset.index = index; // لربط العنصر بالبيانات
            
            const icon = p.source === 'manual' ? '✍️' : '🤖';
            
            // تصميم HTML داخلي احترافي
            li.innerHTML = `
                <span class="term-icon">${icon}</span>
                <span class="term-text">${p.key}</span>
                <span class="term-divider">:</span>
                <span class="term-translation">${p.value}</span>
            `;

            // ربط حدث الضغط (مطابق لـ tableview_did_select)
            li.addEventListener('click', () => handleSelection(li, p));
            
            glossaryList.appendChild(li);
        });
    }

    /**
     * (مطابق لـ tableview_did_select في بايثون)
     * يتم استدعاؤه عند الضغط على عنصر
     */
    function handleSelection(liElement, termData) {
        // إزالة التحديد السابق
        glossaryList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        // إضافة التحديد الحالي
        liElement.classList.add('selected');

        // ملء الحقول (مطابق لـ `self.tf_en.text = ...`)
        selectedKey = termData.key;
        selectedSource = termData.source;
        enTermField.value = termData.key;
        arTermField.value = termData.value;
    }

    /**
     * (مطابق لـ add_or_update في بايثون)
     * إضافة أو تحديث مصطلح
     */
    function addOrUpdate() {
        const key = enTermField.value.trim();
        const val = arTermField.value.trim();

        if (!key || !val) {
            showToast('⚠️ يرجى إدخال المصطلح والترجمة', 'error');
            return;
        }

        // --- هذا هو المنطق الأهم ---
        // (مطابق لـ `if key in self.glossary_data["extracted_terms"]...`)
        // إذا كان المصطلح موجوداً في "المستخرجة"، احذفه من هناك
        // لأنه سيتم ترقيته إلى "يدوي"
        if (glossaryData.extracted_terms[key]) {
            delete glossaryData.extracted_terms[key];
        }

        // أضفه دائماً إلى "اليدوي"
        glossaryData.manual_terms[key] = val;

        // --- الربط مع المترجم ---
        // استخدام الدالة المستوردة من translator_core.js للحفظ
        saveGlossary(glossaryData); 

        clearSelection();
        filterAndSortGlossary(); // إعادة تحميل القائمة
        showToast('✅ تم إضافة / تحديث المصطلح (يدوي)', 'success');
    }

    /**
     * (مطابق لـ delete_selected في بايثون)
     * حذف مصطلح محدد
     */
    function deleteSelected() {
        if (!selectedKey || !selectedSource) {
            showToast('⚠️ يرجى تحديد مصطلح للحذف', 'error');
            return;
        }

        let deleted = false;
        
        // (مطابق لـ `if self.selected_source == 'manual' ...`)
        if (selectedSource === 'manual' && glossaryData.manual_terms[selectedKey]) {
            delete glossaryData.manual_terms[selectedKey];
            deleted = true;
        } 
        // (مطابق لـ `elif self.selected_source == 'extracted' ...`)
        else if (selectedSource === 'extracted' && glossaryData.extracted_terms[selectedKey]) {
            delete glossaryData.extracted_terms[selectedKey];
            deleted = true;
        }

        if (deleted) {
            // --- الربط مع المترجم ---
            // استخدام الدالة المستوردة من translator_core.js للحفظ
            saveGlossary(glossaryData); 
            
            clearSelection();
            filterAndSortGlossary(); // إعادة تحميل القائمة
            showToast('✅ تم حذف المصطلح', 'success');
        } else {
            showToast('⚠️ لم يتم العثور على المصطلح للحذف', 'error');
        }
    }

    // === الإضافة الجديدة هنا ===

    /**
     * دالة لتصدير المسرد كملف JSON
     */
    function exportGlossary() {
        try {
            // استخدام glossaryData الحالية في الذاكرة
            const jsonString = JSON.stringify(glossaryData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'zeus_glossary.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('📤 تم تصدير المسرد بنجاح', 'success');

        } catch (error) {
            console.error('Export failed:', error);
            showToast('⚠️ فشل تصدير المسرد', 'error');
        }
    }

    /**
     * دالة لمعالجة الملف المستورد
     */
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            showToast('⚠️ يرجى اختيار ملف .json فقط', 'error');
            event.target.value = null; // إعادة تعيين الحقل
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const importedData = JSON.parse(content);

                // التحقق من صحة هيكل الملف
                if (importedData && typeof importedData.manual_terms === 'object' && typeof importedData.extracted_terms === 'object') {
                    
                    // اعتماد البيانات الجديدة (استبدال كامل)
                    glossaryData = importedData;

                    // --- الربط مع المترجم ---
                    saveGlossary(glossaryData); // حفظ البيانات الجديدة في التخزين

                    // إعادة تحميل الواجهة بالبيانات الجديدة
                    clearSelection();
                    filterAndSortGlossary(); 
                    
                    showToast('📥 تم استيراد المسرد بنجاح', 'success');

                } else {
                    showToast('⚠️ ملف JSON غير صالح أو لا يحتوي على الهيكل المطلوب (manual_terms, extracted_terms)', 'error');
                }
            } catch (error) {
                console.error('Import parse failed:', error);
                showToast('⚠️ فشل في قراءة ملف JSON', 'error');
            } finally {
                event.target.value = null; // إعادة تعيين الحقل للسماح بإعادة الرفع
            }
        };

        reader.onerror = () => {
            showToast('⚠️ فشل في قراءة الملف', 'error');
            event.target.value = null; // إعادة تعيين الحقل
        };

        reader.readAsText(file);
    }

    // === نهاية الإضافة ===

    /**
     * (مطابق لـ reload في بايثون)
     * تحميل البيانات الأولية عند فتح الصفحة
     */
    function initialLoad() {
        // --- الربط مع المترجم ---
        // استخدام الدالة المستوردة من translator_core.js للجلب
        glossaryData = loadGlossary(); 
        
        // التأكد من أن الهيكل سليم
        if (!glossaryData.manual_terms) glossaryData.manual_terms = {};
        if (!glossaryData.extracted_terms) glossaryData.extracted_terms = {};

        filterAndSortGlossary();
    }

    // --- 5. ربط الأحداث (Event Listeners) ---

    // البحث الفوري
    searchField.addEventListener('input', filterAndSortGlossary);

    // أزرار الفلترة والفرز
    typeFilter.addEventListener('click', (e) => {
        if (e.target.classList.contains('segment')) {
            updateSegmentedControl(typeFilter, e.target);
            filterAndSortGlossary();
        }
    });

    sortPicker.addEventListener('click', (e) => {
        if (e.target.classList.contains('segment')) {
            updateSegmentedControl(sortPicker, e.target);
            filterAndSortGlossary();
        }
    });

    // أزرار التحكم
    addBtn.addEventListener('click', addOrUpdate);
    deleteBtn.addEventListener('click', deleteSelected);

    // === الإضافة الجديدة هنا ===
    // أزرار الاستيراد والتصدير
    exportBtn.addEventListener('click', exportGlossary);
    
    importBtn.addEventListener('click', () => {
        importFile.click(); // فتح نافذة اختيار الملف
    });

    importFile.addEventListener('change', handleFileImport);
    // === نهاية الإضافة ===


    // --- 6. بدء التشغيل ---
    initialLoad();

});