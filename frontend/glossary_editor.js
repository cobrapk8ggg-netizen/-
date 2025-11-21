// glossary_editor.js (Async)

document.addEventListener('DOMContentLoaded', () => {

    let glossaryData = { manual_terms: {}, extracted_terms: {} };
    let currentDisplayedPairs = [];
    let selectedItems = [];

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
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');

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

    function updateSegmentedControl(container, clickedButton) {
        container.querySelectorAll('.segment').forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
    }

    function clearSelection() {
        selectedItems = [];
        enTermField.value = '';
        arTermField.value = '';
        enTermField.placeholder = "المصطلح الإنجليزي";
        arTermField.placeholder = "الترجمة العربية";
        glossaryList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        deselectAllBtn.style.display = 'none';
    }

    function filterAndSortGlossary() {
        const currentFilterText = searchField.value.toLowerCase();
        const currentSort = sortPicker.querySelector('.segment.active').dataset.sort;
        const currentTypeFilter = typeFilter.querySelector('.segment.active').dataset.filter;

        let allTermsWithSource = [];

        if (currentTypeFilter === 'all' || currentTypeFilter === 'manual') {
            for (const [key, value] of Object.entries(glossaryData.manual_terms)) {
                allTermsWithSource.push({ key, value, source: 'manual' });
            }
        }

        if (currentTypeFilter === 'all' || currentTypeFilter === 'extracted') {
            for (const [key, value] of Object.entries(glossaryData.extracted_terms)) {
                allTermsWithSource.push({ key, value, source: 'extracted' });
            }
        }

        const filteredPairs = allTermsWithSource.filter(term => {
            const keyLower = term.key.toLowerCase();
            const valueLower = term.value.toLowerCase();
            return keyLower.includes(currentFilterText) || valueLower.includes(currentFilterText);
        });

        if (currentSort === 'en') {
            filteredPairs.sort((a, b) => a.key.localeCompare(b.key, 'en', { sensitivity: 'base' }));
        } else if (currentSort === 'ar') {
            filteredPairs.sort((a, b) => a.value.localeCompare(b.value, 'ar', { sensitivity: 'base' }));
        }

        currentDisplayedPairs = filteredPairs;
        renderList(filteredPairs);
    }

    function renderList(pairs) {
        glossaryList.innerHTML = '';
        termsCount.textContent = pairs.length;

        if (pairs.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'empty';
            emptyLi.textContent = '📭 لا توجد مصطلحات تطابق البحث';
            glossaryList.appendChild(emptyLi);
            return;
        }

        pairs.forEach((p, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            
            const icon = p.source === 'manual' ? '✍️' : '🤖';
            
            li.innerHTML = `
                <span class="term-icon">${icon}</span>
                <span class="term-text">${p.key}</span>
                <span class="term-divider">:</span>
                <span class="term-translation">${p.value}</span>
            `;

            const isSelected = selectedItems.findIndex(item => item.key === p.key && item.source === p.source) > -1;
            if (isSelected) {
                li.classList.add('selected');
            }

            li.addEventListener('click', () => handleSelection(li, p));
            glossaryList.appendChild(li);
        });
    }

    function handleSelection(liElement, termData) {
        const findIndex = selectedItems.findIndex(item => item.key === termData.key && item.source === termData.source);

        if (findIndex > -1) {
            selectedItems.splice(findIndex, 1);
            liElement.classList.remove('selected');
        } else {
            selectedItems.push(termData);
            liElement.classList.add('selected');
        }

        if (selectedItems.length === 1) {
            const item = selectedItems[0];
            enTermField.value = item.key;
            arTermField.value = item.value;
            enTermField.placeholder = "المصطلح الإنجليزي";
            arTermField.placeholder = "الترجمة العربية";

        } else if (selectedItems.length > 1) {
            enTermField.value = '';
            arTermField.value = '';
            enTermField.placeholder = `${selectedItems.length} مصطلحات محددة`;
            arTermField.placeholder = `(لا يمكن التعديل المتعدد)`;

        } else {
            clearSelection();
        }
        
        deselectAllBtn.style.display = selectedItems.length > 0 ? 'inline' : 'none';
    }

    async function addOrUpdate() {
        if (selectedItems.length > 1) {
            showToast('⚠️ لا يمكن الإضافة أثناء تحديد عناصر متعددة', 'warning');
            return;
        }

        const key = enTermField.value.trim();
        const val = arTermField.value.trim();

        if (!key || !val) {
            showToast('⚠️ يرجى إدخال المصطلح والترجمة', 'error');
            return;
        }

        if (glossaryData.extracted_terms[key]) {
            delete glossaryData.extracted_terms[key];
        }

        glossaryData.manual_terms[key] = val;

        // حفظ (Async)
        await saveGlossary(glossaryData); 

        clearSelection();
        filterAndSortGlossary();
        showToast('✅ تم إضافة / تحديث المصطلح (يدوي)', 'success');
    }

    async function deleteSelected() {
        if (selectedItems.length === 0) {
            showToast('⚠️ يرجى تحديد مصطلح واحد على الأقل للحذف', 'error');
            return;
        }

        let itemsDeleted = 0;

        selectedItems.forEach(item => {
            const { key, source } = item;
            
            if (source === 'manual' && glossaryData.manual_terms[key]) {
                delete glossaryData.manual_terms[key];
                itemsDeleted++;
            } 
            else if (source === 'extracted' && glossaryData.extracted_terms[key]) {
                delete glossaryData.extracted_terms[key];
                itemsDeleted++;
            }
        });

        if (itemsDeleted > 0) {
            // حفظ (Async)
            await saveGlossary(glossaryData); 
            
            clearSelection();
            filterAndSortGlossary();
            showToast(`✅ تم حذف ${itemsDeleted} مصطلح (مصطلحات)`, 'success');
        } else {
            showToast('⚠️ لم يتم العثور على المصطلحات المحددة للحذف', 'error');
        }
    }

    function exportGlossary() {
        try {
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

    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json') {
            showToast('⚠️ يرجى اختيار ملف .json فقط', 'error');
            event.target.value = null;
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const importedData = JSON.parse(content);

                if (importedData && typeof importedData.manual_terms === 'object' && typeof importedData.extracted_terms === 'object') {
                    
                    glossaryData = importedData;

                    // حفظ (Async)
                    await saveGlossary(glossaryData);

                    clearSelection();
                    filterAndSortGlossary(); 
                    
                    showToast('📥 تم استيراد المسرد بنجاح', 'success');

                } else {
                    showToast('⚠️ ملف JSON غير صالح', 'error');
                }
            } catch (error) {
                console.error('Import parse failed:', error);
                showToast('⚠️ فشل في قراءة ملف JSON', 'error');
            } finally {
                event.target.value = null;
            }
        };

        reader.onerror = () => {
            showToast('⚠️ فشل في قراءة الملف', 'error');
            event.target.value = null;
        };

        reader.readAsText(file);
    }

    // الدالة الأولية (Async)
    async function initialLoad() {
        // تحميل (Async)
        glossaryData = await loadGlossary(); 
        
        if (!glossaryData.manual_terms) glossaryData.manual_terms = {};
        if (!glossaryData.extracted_terms) glossaryData.extracted_terms = {};

        filterAndSortGlossary();
    }

    searchField.addEventListener('input', filterAndSortGlossary);

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

    addBtn.addEventListener('click', addOrUpdate);
    deleteBtn.addEventListener('click', deleteSelected);
    exportBtn.addEventListener('click', exportGlossary);
    
    importBtn.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', handleFileImport);

    selectAllBtn.addEventListener('click', () => {
        selectedItems = [...currentDisplayedPairs];
        glossaryList.querySelectorAll('li').forEach(li => {
            if (!li.classList.contains('empty')) {
                li.classList.add('selected');
            }
        });
        if (selectedItems.length > 0) {
            enTermField.value = '';
            arTermField.value = '';
            enTermField.placeholder = `${selectedItems.length} مصطلحات محددة`;
            arTermField.placeholder = `(لا يمكن التعديل المتعدد)`;
            deselectAllBtn.style.display = 'inline';
        }
    });

    deselectAllBtn.addEventListener('click', () => {
        clearSelection();
    });

    // بدء التشغيل
    initialLoad();
});
