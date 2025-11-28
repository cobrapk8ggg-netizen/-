// --- الحالة الابتدائية للتطبيق ---
        const state = {
            selectedFile: null,
            selectedFileDB: 'none', 
            fontSize: 18,
            lineSpacing: 1.5,
            fontName: 'Geeza Pro',
            theme: 'dark',
            interfaceColor: 'dark',
            readMode: false,
            fullscreen: false,
            fileSortType: 'modified', 
            fileSortReversed: false,
            fileDBType: 'english',
            // == الإعدادات الجديدة المفصلة ==
            markdownEnabled: false,
            markdownQuote: 'standard',
            markdownHideQuotes: false,
            markdownSize: 100, // ✅ جديد: حجم النص الغامق (بالنسبة المئوية)
            dialogueEnabled: false,
            dialogueQuote: 'single',
            dialogueColor: '#28a745',
            dialogueHideQuotes: false,
            dialogueSize: 100 // ✅ جديد: حجم نص الحوار (بالنسبة المئوية)
        };

        // --- جلب العناصر الأساسية ---
        const elements = {
            container: document.getElementById('editorContainer'),
            header: document.getElementById('header'),
            controls: document.getElementById('controls'),
            textEditor: document.getElementById('textEditor'),
            stats: document.getElementById('stats'),
            exitBtn: document.getElementById('exitBtn'),
            filenameInput: document.getElementById('filenameInput'),
            newChapterBtn: document.getElementById('newChapterBtn'),
            
            prevChapterBtn: document.getElementById('prevChapterBtn'),
            nextChapterBtn: document.getElementById('nextChapterBtn'),
            
            // === 💡 إضافة زر النسخ ====
            copyAllBtn: document.getElementById('copyAllBtn'),
            // =========================

            fileModal: document.getElementById('fileModal'),
            colorModal: document.getElementById('colorModal'),
            findReplaceModal: document.getElementById('findReplaceModal'), 
            
            importTypeModal: document.getElementById('importTypeModal'),
            closeImportTypeModalBtn: document.getElementById('closeImportTypeModalBtn'),
            importEnglishBtn: document.getElementById('importEnglishBtn'),
            importTranslatedBtn: document.getElementById('importTranslatedBtn'),
            
            exportZipModal: document.getElementById('exportZipModal'),
            closeExportZipModalBtn: document.getElementById('closeExportZipModalBtn'),
            exportEnglishZipBtn: document.getElementById('exportEnglishZipBtn'),
            exportTranslatedZipBtn: document.getElementById('exportTranslatedZipBtn'),

            dbTypeControl: document.getElementById('dbTypeControl'), 
            fileSearchInput: document.getElementById('fileSearchInput'),
            selectFilesBtn: document.getElementById('selectFilesBtn'),
            deleteFilesBtn: document.getElementById('deleteFilesBtn'),
            reverseSortBtn: document.getElementById('reverseSortBtn'),
            sortControl: document.getElementById('sortControl'),
            fileList: document.getElementById('fileList'),
            
            selectAllFilesBtn: document.getElementById('selectAllFilesBtn'),
            deselectAllFilesBtn: document.getElementById('deselectAllFilesBtn'),
            // حذفنا زر toggleDialogueBtn القديم وأضفنا عناصر النافذة الجديدة
            formatBtn: document.getElementById('formatBtn'),
            formatModal: document.getElementById('formatModal'),
            closeFormatModalBtn: document.getElementById('closeFormatModalBtn'),

            fontSelectBtn: document.getElementById('fontSelectBtn'),
            themeSelectBtn: document.getElementById('themeSelectBtn'),
            fontModal: document.getElementById('fontModal'),
            themeModal: document.getElementById('themeModal'),
            fontList: document.getElementById('fontList'),
            themeList: document.getElementById('themeList'),
            closeFontModalBtn: document.getElementById('closeFontModalBtn'),
            closeThemeModalBtn: document.getElementById('closeThemeModalBtn')
        };
        
        let cmEditor;
        let autoSaveTimer = null;

        // --- حالة نافذة الملفات (للتحديد) ---
        let fileModalSelectMode = false;
        let fileModalSelectedFiles = new Set();
        let pendingImportFiles = null;

        function loadConfig() {
            const config = localStorage.getItem('zeusEditorConfig');
            if (config) {
                const parsed = JSON.parse(config);
                state.fontSize = parsed.fontSize || 18;
                state.lineSpacing = parsed.lineSpacing || 1.5;
                state.fontName = parsed.fontName || 'Geeza Pro';
                state.theme = parsed.theme || 'white';
                state.interfaceColor = parsed.interfaceColor || 'white';
                state.selectedFile = parsed.lastOpenedFile || null;
                state.selectedFileDB = parsed.lastOpenedFileDB || 'none'; 
                state.fileSortType = parsed.fileSortType || 'modified';
                state.fileSortReversed = parsed.fileSortReversed || false;
                state.fileDBType = parsed.fileDBType || 'english';
                
                // استعادة إعدادات التنسيق
                state.markdownEnabled = parsed.markdownEnabled || false;
                state.markdownQuote = parsed.markdownQuote || 'standard';
                state.markdownHideQuotes = parsed.markdownHideQuotes || false;
                state.markdownSize = parsed.markdownSize || 100; // ✅ جديد
                state.dialogueEnabled = parsed.dialogueEnabled || false;
                state.dialogueQuote = parsed.dialogueQuote || 'single';
                state.dialogueColor = parsed.dialogueColor || '#28a745';
                state.dialogueHideQuotes = parsed.dialogueHideQuotes || false;
                state.dialogueSize = parsed.dialogueSize || 100; // ✅ جديد

                applyInterfaceColor(state.interfaceColor); 
                updateDialogueColorCSS(state.dialogueColor);
                updateFormattingSizes(); // ✅ جديد: تطبيق الأحجام
            }
            
            if (state.selectedFile && state.selectedFileDB !== 'none') {
                if (typeof readEnglishChapter !== 'undefined' && typeof readTranslatedChapter !== 'undefined') {
                    if (cmEditor) {
                        loadFile(state.selectedFile, state.selectedFileDB);
                    } else {
                        document.addEventListener('DOMContentLoaded', () => {
                            loadFile(state.selectedFile, state.selectedFileDB);
                        });
                    }
                } else {
                    console.error("لم يتم تحميل دوال قراءة الفصول (translator_core.js)!");
                }
            }
        }

        function saveConfig() {
            const config = {
                fontSize: state.fontSize,
                lineSpacing: state.lineSpacing,
                fontName: state.fontName,
                theme: state.theme,
                interfaceColor: state.interfaceColor,
                lastOpenedFile: state.selectedFile,
                lastOpenedFileDB: state.selectedFileDB, 
                fileSortType: state.fileSortType,
                fileSortReversed: state.fileSortReversed,
                fileDBType: state.fileDBType,
                // حفظ التنسيقات
                markdownEnabled: state.markdownEnabled,
                markdownQuote: state.markdownQuote,
                markdownHideQuotes: state.markdownHideQuotes,
                markdownSize: state.markdownSize, // ✅ جديد
                dialogueEnabled: state.dialogueEnabled,
                dialogueQuote: state.dialogueQuote,
                dialogueColor: state.dialogueColor,
                dialogueHideQuotes: state.dialogueHideQuotes,
                dialogueSize: state.dialogueSize // ✅ جديد
            };
            localStorage.setItem('zeusEditorConfig', JSON.stringify(config));
        }

        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        function setupEventListeners() {
            document.getElementById('openChapterBtn').addEventListener('click', openFileModal);
            document.getElementById('newChapterBtn').addEventListener('click', createNewChapter);
            
            elements.prevChapterBtn.addEventListener('click', () => navigateChapter('prev'));
            elements.nextChapterBtn.addEventListener('click', () => navigateChapter('next'));
            
            // ==== 💡 تفعيل زر النسخ ====
            elements.copyAllBtn.addEventListener('click', copyAllContent);
            // =========================

            document.getElementById('importFileBtn').addEventListener('click', onImportClick); 
            document.getElementById('exportZipBtn').addEventListener('click', openExportZipModal); 
            document.getElementById('bgColorBtn').addEventListener('click', openColorModal);
            document.getElementById('readBtn').addEventListener('click', toggleReadMode);
            document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
            document.getElementById('exitBtn').addEventListener('click', exitSpecialMode);
            document.getElementById('saveBtn').addEventListener('click', () => saveChanges(false)); 
            document.getElementById('increaseFontBtn').addEventListener('click', increaseFont);
            document.getElementById('decreaseFontBtn').addEventListener('click', decreaseFont);
            document.getElementById('spacingBtn').addEventListener('click', toggleSpacing);
            document.getElementById('undoBtn').addEventListener('click', undo);
            document.getElementById('redoBtn').addEventListener('click', redo);
            
            document.getElementById('cmFindBtn').addEventListener('click', () => {
                const editorWrapper = cmEditor.getWrapperElement();
                const dialogOpen = editorWrapper.querySelector('.CodeMirror-dialog');
                if (dialogOpen) {
                    cmEditor.execCommand("clearSearch");
                } else {
                    cmEditor.execCommand("find"); 
                }
            });
            
            document.getElementById('cmReplaceBtn').addEventListener('click', openFindReplaceModal); 
            
            // === أحداث التنسيق الجديدة ===
            elements.formatBtn.addEventListener('click', openFormatModal);
            elements.closeFormatModalBtn.addEventListener('click', () => elements.formatModal.classList.remove('show'));
            
            // تبديل الماركدون
            document.getElementById('toggleMarkdownHeader').addEventListener('click', () => {
                state.markdownEnabled = !state.markdownEnabled;
                saveConfig(); updateFormatUI(); updateEditorOverlays();
            });
            // تبديل الحوار
            document.getElementById('toggleDialogueHeader').addEventListener('click', () => {
                state.dialogueEnabled = !state.dialogueEnabled;
                saveConfig(); updateFormatUI(); updateEditorOverlays();
            });

            // اختيار نوع القوس للماركدون
            document.querySelectorAll('.quote-opt-md').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    state.markdownQuote = e.target.dataset.val;
                    saveConfig(); updateFormatUI(); updateEditorOverlays();
                });
            });

            // اختيار نوع القوس للحوار
            document.querySelectorAll('.quote-opt-dl').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    state.dialogueQuote = e.target.dataset.val;
                    saveConfig(); updateFormatUI(); updateEditorOverlays();
                });
            });

            // ✅ جديد: تبديل إخفاء علامات الماركدون
            document.getElementById('toggleMarkdownHide').addEventListener('click', () => {
                state.markdownHideQuotes = !state.markdownHideQuotes;
                saveConfig(); updateFormatUI(); updateEditorOverlays();
            });

            // ✅ جديد: تبديل إخفاء علامات الحوار
            document.getElementById('toggleDialogueHide').addEventListener('click', () => {
                state.dialogueHideQuotes = !state.dialogueHideQuotes;
                saveConfig(); updateFormatUI(); updateEditorOverlays();
            });
            
            // ✅ جديد: تكبير/تصغير النص الغامق
            document.getElementById('increaseMarkdownSizeBtn').addEventListener('click', () => {
                state.markdownSize = Math.min(200, state.markdownSize + 10);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });
            document.getElementById('decreaseMarkdownSizeBtn').addEventListener('click', () => {
                state.markdownSize = Math.max(100, state.markdownSize - 10);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });
            document.getElementById('markdownSizeRange').addEventListener('input', (e) => {
                state.markdownSize = parseInt(e.target.value);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });
            
            // ✅ جديد: تكبير/تصغير نص الحوار
            document.getElementById('increaseDialogueSizeBtn').addEventListener('click', () => {
                state.dialogueSize = Math.min(200, state.dialogueSize + 10);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });
            document.getElementById('decreaseDialogueSizeBtn').addEventListener('click', () => {
                state.dialogueSize = Math.max(100, state.dialogueSize - 10);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });
            document.getElementById('dialogueSizeRange').addEventListener('input', (e) => {
                state.dialogueSize = parseInt(e.target.value);
                updateFormattingSizes(); updateFormatUI(); saveConfig();
            });

            // اختيار اللون
            document.querySelectorAll('.color-circle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if(e.target.id === 'customDialogueColor') return;
                    updateDialogueColorCSS(e.target.dataset.col);
                });
            });
            document.getElementById('customDialogueColor').addEventListener('input', (e) => {
                updateDialogueColorCSS(e.target.value);
            });

            document.getElementById('closeFindReplaceModalBtn').addEventListener('click', closeFindReplaceModal);
            document.getElementById('performFindReplaceBtn').addEventListener('click', performFindReplace);
            document.getElementById('closeFileModalBtn').addEventListener('click', closeFileModal);
            document.getElementById('closeColorModalBtn').addEventListener('click', closeColorModal);
            elements.closeImportTypeModalBtn.addEventListener('click', () => elements.importTypeModal.classList.remove('show'));
            elements.importEnglishBtn.addEventListener('click', () => startImportProcess('english'));
            elements.importTranslatedBtn.addEventListener('click', () => startImportProcess('translated'));
            elements.closeExportZipModalBtn.addEventListener('click', () => elements.exportZipModal.classList.remove('show'));
            elements.exportEnglishZipBtn.addEventListener('click', () => startZipExport('english'));
            elements.exportTranslatedZipBtn.addEventListener('click', () => startZipExport('translated'));
            elements.fontSelectBtn.addEventListener('click', openFontModal);
            elements.themeSelectBtn.addEventListener('click', openThemeModal);
            elements.closeFontModalBtn.addEventListener('click', closeFontModal);
            elements.closeThemeModalBtn.addEventListener('click', closeThemeModal);
            elements.filenameInput.addEventListener('change', renameFile);
            elements.filenameInput.addEventListener('blur', renameFile);
            
            elements.dbTypeControl.addEventListener('click', (e) => {
                 if (e.target.classList.contains('segment')) {
                     const selectedDB = e.target.dataset.db; 
                     document.querySelectorAll('#dbTypeControl .segment').forEach(s => s.classList.remove('active'));
                     e.target.classList.add('active');
                     state.fileDBType = selectedDB;
                     saveConfig(); 
                     updateFileListView(); 
                 }
            });
            
            elements.fileSearchInput.addEventListener('input', updateFileListView);
            elements.sortControl.addEventListener('click', (e) => {
                 if (e.target.classList.contains('segment')) {
                     document.querySelectorAll('#sortControl .segment').forEach(s => s.classList.remove('active'));
                     e.target.classList.add('active');
                     state.fileSortType = e.target.dataset.sort;
                     saveConfig();
                     updateFileListView(); 
                 }
            });
            elements.reverseSortBtn.addEventListener('click', () => {
                state.fileSortReversed = !state.fileSortReversed; 
                elements.reverseSortBtn.classList.toggle('active', state.fileSortReversed); 
                saveConfig(); 
                updateFileListView(); 
            });
            elements.selectFilesBtn.addEventListener('click', toggleSelectMode);
            elements.deleteFilesBtn.addEventListener('click', deleteSelectedFiles);
            elements.selectAllFilesBtn.addEventListener('click', selectAllFiles);
            elements.deselectAllFilesBtn.addEventListener('click', deselectAllFiles);

            // تفعيل اختصارات لوحة المفاتيح
            document.addEventListener('keydown', function(event) {
                const key = event.key; 
                if (key === 'ArrowLeft') {
                    if (state.readMode || event.altKey) {
                        event.preventDefault(); 
                        navigateChapter('next');
                    }
                } 
                else if (key === 'ArrowRight') {
                    if (state.readMode || event.altKey) {
                        event.preventDefault();
                        navigateChapter('prev');
                    }
                }
            });

            // تفعيل السحب
            let touchStartX = 0;
            let touchStartY = 0;

            document.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: false }); 

            document.addEventListener('touchend', e => {
                let touchEndX = e.changedTouches[0].screenX;
                let touchEndY = e.changedTouches[0].screenY;
                
                if (Math.abs(touchEndY - touchStartY) > 70) return; 

                const diff = touchEndX - touchStartX;
                const threshold = 60; 

                if (Math.abs(diff) > threshold) {
                    if (diff > 0) {
                        navigateChapter('prev');
                    } else {
                        navigateChapter('next');
                    }
                }
            }, { passive: false });
        }

        // ==== 💡 دالة نسخ المحتوى بالكامل ====
        function copyAllContent() {
            if (!cmEditor) return;
            
            // 1. جلب كل النص من "ذاكرة" المحرر وليس من العرض فقط
            const text = cmEditor.getValue();
            
            if (!text) {
                showNotification('⚠️ الملف فارغ!', 'warning');
                return;
            }

            // 2. استخدام API الحافظة الحديث
            navigator.clipboard.writeText(text).then(() => {
                showNotification('✅ تم نسخ الفصل بالكامل!');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showNotification('❌ فشل النسخ', 'error');
            });
        }
        // ====================================

        function navigateChapter(direction) {
            if (!state.selectedFile || state.selectedFileDB === 'none') {
                showNotification('⚠️ يجب فتح فصل أولاً للتنقل.', 'warning');
                return;
            }

            const dbKey = (state.selectedFileDB === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            const fileNames = Object.keys(files);

            if (fileNames.length <= 1) {
                showNotification('لا توجد فصول أخرى للتنقل إليها.', 'warning');
                return;
            }

            fileNames.sort((a, b) => {
                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
            });

            const currentIndex = fileNames.indexOf(state.selectedFile);
            if (currentIndex === -1) return; 

            let targetFile = null;
            if (direction === 'next') {
                if (currentIndex < fileNames.length - 1) {
                    targetFile = fileNames[currentIndex + 1];
                } else {
                    showNotification('🚫 هذا هو الفصل الأخير.', 'warning');
                }
            } else if (direction === 'prev') {
                if (currentIndex > 0) {
                    targetFile = fileNames[currentIndex - 1];
                } else {
                    showNotification('🚫 هذا هو الفصل الأول.', 'warning');
                }
            }

            if (targetFile) {
                saveChanges(true); 
                loadFile(targetFile, state.selectedFileDB);
            }
        }

        function applyTheme(theme) {
            if (cmEditor) {
                const cmWrapper = cmEditor.getWrapperElement();
                cmWrapper.classList.remove('theme-white', 'theme-dark', 'theme-blue-dark');
                cmWrapper.classList.add(`theme-${theme}`);
                elements.textEditor.classList.remove('theme-white', 'theme-dark', 'theme-blue-dark');
                elements.textEditor.classList.add(`theme-${theme}`);
            }
            state.theme = theme;
            saveConfig();
        }

        function applyFont(fontName) {
            if (cmEditor) {
                cmEditor.getWrapperElement().style.fontFamily = fontName;
                cmEditor.refresh(); 
            }
            state.fontName = fontName;
            saveConfig();
        }

        function applyFontSize(size) {
            if (cmEditor) {
                cmEditor.getWrapperElement().style.fontSize = `${size}px`;
                cmEditor.refresh();
            }
            state.fontSize = size;
            saveConfig();
        }

        function applyLineSpacing(spacing) {
            if (cmEditor) {
                cmEditor.getWrapperElement().style.lineHeight = spacing;
                cmEditor.refresh();
            }
            state.lineSpacing = spacing;
            saveConfig();
        }

        function increaseFont() {
            applyFontSize(state.fontSize + 1);
        }

        function decreaseFont() {
            if (state.fontSize > 8) {
                applyFontSize(state.fontSize - 1);
            }
        }

        function toggleSpacing() {
            let newSpacing = state.lineSpacing;
            if (state.lineSpacing === 1.5) newSpacing = 2.0;
            else if (state.lineSpacing === 2.0) newSpacing = 1.0;
            else newSpacing = 1.5;
            applyLineSpacing(newSpacing);
            showNotification(`تم ضبط التباعد إلى ${newSpacing}`, 'warning');
        }

        function undo() {
            if (cmEditor) cmEditor.undo();
        }

        function redo() {
            if (cmEditor) cmEditor.redo();
        }

        function updateStats() {
            if (!cmEditor) return; 
            const text = cmEditor.getValue();
            const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
            const lineCount = cmEditor.lineCount(); 
            elements.stats.textContent = `📝 ${wordCount} كلمة | 📏 ${lineCount} سطر`;
        }
        
        const systemTextOverlay = {
            token: function(stream) {
                if (stream.match(/\[.*?\]/)) { return "system-text"; }
                while (stream.next() != null && !stream.match(/\[.*?\]/, false)) {}
                return null;
            }
        };

        // === قاموس العلامات ===
        const QUOTES_MAP = {
            'standard': ['"', '"'],
            'single': ["'", "'"],
            'smart': ['“', '”'],
            'guillemets': ['«', '»']
        };

        // دالة تحديث المتغير اللوني CSS
        function updateDialogueColorCSS(color) {
            state.dialogueColor = color;
            document.documentElement.style.setProperty('--dialogue-color', color);
            saveConfig();
            updateFormatUI();
        }

        // ✅ دالة جديدة: تحديث أحجام النصوص المنسقة
        function updateFormattingSizes() {
            document.documentElement.style.setProperty('--markdown-size', `${state.markdownSize}%`);
            document.documentElement.style.setProperty('--dialogue-size', `${state.dialogueSize}%`);
        }



        // دالة إنشاء الطبقة (Overlay) بشكل ديناميكي
        function createCustomOverlay(type, startChar, endChar, hideQuotes) {
            return {
                token: function(stream) {
                    // التحقق من علامة البداية
                    if (stream.match(startChar, false)) {
                        // استهلاك علامة البداية
                        stream.match(startChar);
                        
                        // إذا نريد إخفاء العلامات، نرجع كلاس خاص
                        if (hideQuotes) {
                            // نحفظ الموضع لنتمكن من قراءة المحتوى
                            let contentStart = stream.pos;
                            let ch;
                            
                            // نبحث عن علامة النهاية
                            while ((ch = stream.next()) != null) {
                                if (ch === endChar) {
                                    // وجدنا علامة النهاية - نعيد المؤشر قبلها
                                    stream.pos--;
                                    break;
                                }
                            }
                            
                            // نرجع كلاس الإخفاء لعلامة البداية
                            stream.pos = contentStart - startChar.length;
                            stream.match(startChar);
                            return "quote-hidden";
                        }
                        
                        // إذا لا نريد الإخفاء، نتابع بشكل عادي
                        let ch;
                        while ((ch = stream.next()) != null) {
                            if (ch === endChar) {
                                stream.pos--;
                                return type === 'markdown' ? "markdown-bold" : "dialogue-text";
                            }
                        }
                        return type === 'markdown' ? "markdown-bold" : "dialogue-text";
                    }
                    
                    // التحقق من المحتوى بين العلامتين
                    // نبحث للخلف لنرى إن كنا داخل نص منسق
                    let lineStart = stream.string.lastIndexOf(startChar, stream.pos);
                    let lineEnd = stream.string.indexOf(endChar, stream.pos);
                    
                    if (lineStart !== -1 && lineEnd !== -1 && lineStart < stream.pos && stream.pos < lineEnd) {
                        // نحن داخل نص منسق
                        let ch;
                        while ((ch = stream.next()) != null) {
                            if (ch === endChar) {
                                stream.pos--;
                                break;
                            }
                        }
                        return type === 'markdown' ? "markdown-bold" : "dialogue-text";
                    }
                    
                    // التحقق من علامة النهاية
                    if (stream.match(endChar, false)) {
                        stream.match(endChar);
                        if (hideQuotes) {
                            return "quote-hidden";
                        }
                        return null;
                    }
                    
                    // حرف عادي
                    stream.next();
                    return null;
                }
            };
        }

        // متغيرات لحفظ الطبقات الحالية لإزالتها لاحقاً
        let currentMdOverlay = null;
        let currentDlOverlay = null;

        function updateEditorOverlays() {
            if (!cmEditor) return;

            // إزالة الطبقات القديمة
            if (currentMdOverlay) cmEditor.removeOverlay(currentMdOverlay);
            if (currentDlOverlay) cmEditor.removeOverlay(currentDlOverlay);

            // إضافة طبقة الماركدون إذا مفعلة
            if (state.markdownEnabled) {
                const q = QUOTES_MAP[state.markdownQuote];
                currentMdOverlay = createCustomOverlay('markdown', q[0], q[1], state.markdownHideQuotes); // ✅ تمرير hideQuotes
                cmEditor.addOverlay(currentMdOverlay);
            }

            // إضافة طبقة الحوار إذا مفعلة
            if (state.dialogueEnabled) {
                const q = QUOTES_MAP[state.dialogueQuote];
                currentDlOverlay = createCustomOverlay('dialogue', q[0], q[1], state.dialogueHideQuotes); // ✅ تمرير hideQuotes
                cmEditor.addOverlay(currentDlOverlay);
            }
        }

        // واجهة المستخدم للنافذة
        function openFormatModal() {
            updateFormatUI();
            elements.formatModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.formatModal.classList.add('show');
        }

        function updateFormatUI() {
            // تحديث حالة الماركدون
            document.getElementById('markdownStatus').textContent = state.markdownEnabled ? '✅ مفعل' : '❌ معطل';
            document.getElementById('markdownPanel').style.display = state.markdownEnabled ? 'block' : 'none';
            document.querySelectorAll('.quote-opt-md').forEach(b => {
                b.classList.toggle('active', b.dataset.val === state.markdownQuote);
            });
            const mdHideIcon = document.getElementById('markdownHideIcon');
            if (mdHideIcon) {
                mdHideIcon.textContent = state.markdownHideQuotes ? '👁️' : '👁️‍🗨️';
            }
            // ✅ جديد: تحديث الشريط والعرض
            const mdSizeRange = document.getElementById('markdownSizeRange');
            const mdSizeLabel = document.getElementById('markdownSizeLabel');
            if (mdSizeRange) mdSizeRange.value = state.markdownSize;
            if (mdSizeLabel) mdSizeLabel.textContent = `${state.markdownSize}%`;

            // تحديث حالة الحوار
            document.getElementById('dialogueStatus').textContent = state.dialogueEnabled ? '✅ مفعل' : '❌ معطل';
            document.getElementById('dialoguePanel').style.display = state.dialogueEnabled ? 'block' : 'none';
            document.querySelectorAll('.quote-opt-dl').forEach(b => {
                b.classList.toggle('active', b.dataset.val === state.dialogueQuote);
            });
            const dlHideIcon = document.getElementById('dialogueHideIcon');
            if (dlHideIcon) {
                dlHideIcon.textContent = state.dialogueHideQuotes ? '👁️' : '👁️‍🗨️';
            }
            // ✅ جديد: تحديث الشريط والعرض
            const dlSizeRange = document.getElementById('dialogueSizeRange');
            const dlSizeLabel = document.getElementById('dialogueSizeLabel');
            if (dlSizeRange) dlSizeRange.value = state.dialogueSize;
            if (dlSizeLabel) dlSizeLabel.textContent = `${state.dialogueSize}%`;

            // تحديث تحديد اللون
            document.querySelectorAll('.color-circle').forEach(c => {
                if (c.id === 'customDialogueColor') {
                    c.value = state.dialogueColor;
                } else {
                    c.classList.toggle('active', c.dataset.col === state.dialogueColor);
                }
            });
        }
        
        function onImportClick() {
            if (typeof saveEnglishChapter === 'undefined' || typeof saveTranslatedChapter === 'undefined') {
                showNotification('خطأ: ملف translator_core.js غير محمل بشكل صحيح.', 'error');
                return;
            }
            elements.importTypeModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.importTypeModal.classList.add('show');
        }
        
        function startImportProcess(importType) {
            elements.importTypeModal.classList.remove('show');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.txt,.zip'; 
            input.multiple = true; 
            input.click(); 
            input.onchange = (e) => {
                const files = e.target.files;
                if (files.length === 0) return;
                processImportedFiles(files, importType);
            };
        }

        async function processImportedFiles(files, dbType) {
            if (typeof JSZip === 'undefined') {
                showNotification('خطأ: مكتبة (JSZip) غير موجودة.', 'error');
                return;
            }
            const dbName = dbType === 'english' ? 'الإنجليزية' : 'المترجمة';
            let importedFileNames = [];
            showNotification(`جاري استيراد ${files.length} ملفات إلى "${dbName}"...`, 'warning');
            const saveFunction = (dbType === 'english') ? saveEnglishChapter : saveTranslatedChapter;
            for (const file of files) {
                const fileNameLower = file.name.toLowerCase();
                if (fileNameLower.endsWith('.zip')) {
                    try {
                        const zip = await JSZip.loadAsync(file); 
                        const txtFilesEntries = [];
                        zip.forEach((relativePath, zipEntry) => {
                            if (zipEntry.name.toLowerCase().endsWith('.txt') && !zipEntry.dir) {
                                txtFilesEntries.push(zipEntry);
                            }
                        });
                        if (txtFilesEntries.length === 0) {
                            showNotification(`ملف ZIP ${file.name} لا يحتوي على ملفات .txt`, 'warning');
                            continue;
                        }
                        for (const zipEntry of txtFilesEntries) {
                            const content = await zipEntry.async('string');
                            const filename = zipEntry.name.split('/').pop(); 
                            saveFunction(filename, content);
                            importedFileNames.push(filename);
                        }
                    } catch (err) {
                        showNotification(`فشل في فك ضغط ${file.name}`, 'error');
                        console.error(err);
                    }
                } else if (fileNameLower.endsWith('.txt')) {
                    try {
                        const content = await file.text(); 
                        const filename = file.name;
                        saveFunction(filename, content);
                        importedFileNames.push(filename);
                    } catch (err) {
                         showNotification(`فشل في قراءة ${file.name}`, 'error');
                         console.error(err);
                    }
                } else {
                    showNotification(`تم تخطي ${file.name} (نوع غير مدعوم)`, 'warning');
                }
            }
            if (importedFileNames.length > 0) {
                loadFile(importedFileNames[importedFileNames.length - 1], dbType); 
                showNotification(`✅ تم استيراد ${importedFileNames.length} فصول إلى "${dbName}"!`);
            } else {
                 showNotification('لم يتم استيراد أي ملفات .txt جديدة', 'warning');
            }
        }

        function renameFile() {
            if (!state.selectedFile || state.selectedFileDB === 'none') {
                showNotification('⚠️ لا يوجد ملف مفتوح لتغيير اسمه', 'error');
                elements.filenameInput.disabled = true;
                elements.filenameInput.value = '';
                return;
            }
            const oldName = state.selectedFile;
            let newName = elements.filenameInput.value.trim();
            if (!newName) {
                showNotification('❌ اسم الملف لا يمكن أن يكون فارغاً', 'error');
                elements.filenameInput.value = oldName;
                return;
            }
            if (!newName.toLowerCase().endsWith('.txt')) {
                newName += '.txt';
                elements.filenameInput.value = newName;
            }
            if (newName === oldName) return;
            const dbKey = (state.selectedFileDB === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            if (files[newName]) {
                showNotification(`❌ ملف بالاسم '${newName}' موجود بالفعل في هذه القاعدة`, 'error');
                elements.filenameInput.value = oldName;
                return;
            }
            files[newName] = files[oldName]; 
            files[newName].modified = Date.now();
            delete files[oldName]; 
            state.selectedFile = newName;
            Storage.set(dbKey, files); 
            saveConfig();
            showNotification(`✅ تم تغيير الاسم إلى\n${newName}`);
        }

        function saveChanges(isAutoSave = false) {
            let filename = state.selectedFile;
            let dbType = state.selectedFileDB;
            if (!filename || dbType === 'none') {
                if (isAutoSave) return; 
                showNotification('لا يوجد ملف مفتوح. قم بإنشاء ملف جديد عبر الحفظ.', 'warning');
                filename = prompt("أدخل اسم الملف الجديد (مثل: chapter1.txt):");
                if (!filename) {
                    showNotification('تم إلغاء الحفظ', 'warning');
                    return;
                }
                const saveLocation = prompt("أين تريد حفظ الملف الجديد؟ اكتب 'انجليزي' أو 'مترجم':");
                if (saveLocation && (saveLocation.toLowerCase().includes('انجليزي') || saveLocation.toLowerCase().includes('english'))) {
                    dbType = 'english';
                } else if (saveLocation && (saveLocation.toLowerCase().includes('مترجم') || saveLocation.toLowerCase().includes('translated'))) {
                    dbType = 'translated';
                } else {
                    showNotification('تم إلغاء الحفظ. يجب تحديد الموقع.', 'warning');
                    return;
                }
                if (!filename.toLowerCase().endsWith('.txt')) {
                    filename += '.txt';
                }
            }
            if (typeof saveEnglishChapter === 'undefined' || typeof readEnglishChapter === 'undefined') {
                showNotification('خطأ: ملف translator_core.js غير محمل!', 'error');
                return;
            }
            const contentToSave = cmEditor.getValue();
            const saveFunction = (dbType === 'english') ? saveEnglishChapter : saveTranslatedChapter;
            
            const dbKey = (dbType === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            const currentContentInDB = (files[filename]) ? files[filename].content : null;

            if (currentContentInDB !== null && currentContentInDB === contentToSave) {
                 if (!isAutoSave) {
                     showNotification('لا توجد تغييرات لحفظها', 'warning');
                 }
                 return;
            }
            saveFunction(filename, contentToSave);
            state.selectedFile = filename;
            state.selectedFileDB = dbType; 
            elements.filenameInput.value = filename;
            elements.filenameInput.disabled = false;
            saveConfig();
            if (!isAutoSave) {
                showNotification(`✅ تم حفظ ${filename} بنجاح`);
            }
        }

        function createNewChapter() {
            let filename = prompt("أدخل اسم الملف الجديد (مثل: chapter1.txt):");
            if (!filename) {
                showNotification('تم إلغاء الإنشاء', 'warning');
                return;
            }
            const saveLocation = prompt("أين تريد حفظ الملف الجديد؟ اكتب 'انجليزي' أو 'مترجم':");
            let dbType;
            if (saveLocation && (saveLocation.toLowerCase().includes('انجليزي') || saveLocation.toLowerCase().includes('english'))) {
                dbType = 'english';
            } else if (saveLocation && (saveLocation.toLowerCase().includes('مترجم') || saveLocation.toLowerCase().includes('translated'))) {
                dbType = 'translated';
            } else {
                showNotification('تم إلغاء الإنشاء. يجب تحديد الموقع.', 'warning');
                return;
            }
            if (!filename.toLowerCase().endsWith('.txt')) {
                filename += '.txt';
            }
            const dbKey = (dbType === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            if (files[filename]) {
                showNotification(`❌ ملف بالاسم '${filename}' موجود بالفعل.`, 'error');
                return;
            }
            const saveFunction = (dbType === 'english') ? saveEnglishChapter : saveTranslatedChapter;
            saveFunction(filename, ""); 
            loadFile(filename, dbType);
            showNotification(`✅ تم إنشاء ${filename} بنجاح`, 'success');
        }

        function loadFile(filename, dbType) {
            if (!cmEditor) {
                showNotification('خطأ: المحرر غير جاهز للتحميل', 'error');
                return;
            }
            const dbKey = (dbType === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            
            if (files[filename] !== undefined) {
                const fileContent = files[filename].content || ""; 
                cmEditor.setValue(fileContent);
                state.selectedFile = filename;
                state.selectedFileDB = dbType; 
                elements.filenameInput.value = filename;
                elements.filenameInput.disabled = false;
                cmEditor.clearHistory();
                updateStats();
                saveConfig();
                if (fileContent === "") {
                    showNotification(`📄 تم فتح ${filename} (ملف جديد)`);
                } else {
                    showNotification(`📖 تم فتح ${filename}`);
                }
                
                // ==== 💡 التعديل هنا: إصلاح التمرير ====
                cmEditor.refresh();
                cmEditor.setCursor(0, 0);
                cmEditor.scrollTo(0, 0);
                setTimeout(() => {
                    cmEditor.scrollTo(0, 0);
                    cmEditor.refresh(); 
                }, 10);
                // ========================================

            } else {
                showNotification(`خطأ: لم يتم العثور على الملف ${filename}`, 'error');
            }
        }
        
        function openFileModal() {
            if (typeof listEnglishChapters === 'undefined' || typeof listTranslatedChapters === 'undefined') {
                showNotification('خطأ: ملف translator_core.js غير محمل!', 'error');
                return;
            }
            fileModalSelectMode = false;
            fileModalSelectedFiles.clear();
            elements.fileSearchInput.value = '';
            elements.selectFilesBtn.textContent = 'تحديد';
            elements.deleteFilesBtn.style.display = 'none';
            elements.fileList.classList.remove('selection-active');
            document.querySelectorAll('#dbTypeControl .segment').forEach(s => {
                s.classList.toggle('active', s.dataset.db === state.fileDBType);
            });
            elements.sortControl.querySelectorAll('.segment').forEach(s => {
                s.classList.toggle('active', s.dataset.sort === state.fileSortType);
            });
            elements.reverseSortBtn.classList.toggle('active', state.fileSortReversed);
            updateFileListView(); 
            elements.fileModal.classList.add('show');
        }

        function closeFileModal() {
            elements.fileModal.classList.remove('show');
        }
        
        function updateFileListView() {
            const searchTerm = elements.fileSearchInput.value.toLowerCase();
            const sortType = state.fileSortType; 
            const activeDBType = elements.dbTypeControl.querySelector('.segment.active').dataset.db;
            const listFunction = (activeDBType === 'english') ? listEnglishChapters : listTranslatedChapters;
            const files = Storage.get( (activeDBType === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS, {});
            const fileArray = Object.entries(files).map(([name, data]) => ({
                name,
                ...data,
                content: data.content || "" 
            }));
            const dbName = (activeDBType === 'english') ? "الإنجليزية" : "المترجمة";
            if (fileArray.length === 0) {
                 elements.fileList.innerHTML = `<li style="padding: 20px; text-align: center; color: #999;">❌ لا توجد فصول في "${dbName}".</li>`;
                 return;
            }
            const filteredArray = fileArray.filter(f => f.name.toLowerCase().includes(searchTerm));
            sortFiles(filteredArray, sortType);
            renderFileList(filteredArray, activeDBType); 
        }

        function sortFiles(fileArray, sortType) {
            const getFileNumber = (name) => {
                const match = name.match(/(\d+)/); 
                return match ? parseInt(match[0], 10) : 0; 
            };
            if (sortType === 'modified') {
                fileArray.sort((a, b) => b.modified - a.modified);
            } else if (sortType === 'alphabetical') {
                fileArray.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
            } else if (sortType === 'numerical') {
                fileArray.sort((a, b) => getFileNumber(a.name) - getFileNumber(b.name));
            }
            if (state.fileSortReversed) {
                fileArray.reverse();
            }
        }

        function renderFileList(fileArray, dbType) { 
            elements.fileList.innerHTML = ''; 
            if (fileArray.length === 0) {
                 elements.fileList.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">❌ لا توجد فصول تطابق البحث.</li>';
                 return;
            }
            fileArray.forEach(file => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.dataset.filename = file.name; 
                const sizeKB = (file.content.length / 1024).toFixed(2);
                const modifiedDate = formatFileDate(file.modified); 
                const isChecked = fileModalSelectedFiles.has(file.name);
                if (isChecked) {
                    li.classList.add('selected');
                }
                li.innerHTML = `
                    <div class="file-checkbox-container">
                        <input type="checkbox" class="file-checkbox" ${isChecked ? 'checked' : ''}>
                    </div>
                    <div class="file-details">
                        <div>${file.name}</div>
                        <div class="file-info">${sizeKB} KB | ${modifiedDate}</div>
                    </div>
                `;
                li.addEventListener('click', (e) => {
                    const filename = li.dataset.filename;
                    if (fileModalSelectMode) {
                        const checkbox = li.querySelector('.file-checkbox');
                        if (fileModalSelectedFiles.has(filename)) {
                            fileModalSelectedFiles.delete(filename);
                            li.classList.remove('selected');
                            checkbox.checked = false;
                        } else {
                            fileModalSelectedFiles.add(filename);
                            li.classList.add('selected');
                            checkbox.checked = true;
                        }
                        elements.deleteFilesBtn.textContent = `حذف (${fileModalSelectedFiles.size})`;
                    } else {
                        loadFile(filename, dbType);
                        closeFileModal();
                    }
                });
                elements.fileList.appendChild(li);
            });
        }
        
        function toggleSelectMode() {
            fileModalSelectMode = !fileModalSelectMode;
            elements.fileList.classList.toggle('selection-active', fileModalSelectMode);
            if (fileModalSelectMode) {
                elements.selectFilesBtn.textContent = 'إلغاء التحديد';
                elements.deleteFilesBtn.style.display = 'block';
                elements.deleteFilesBtn.textContent = 'حذف';
                elements.selectAllFilesBtn.style.display = 'block';
                elements.deselectAllFilesBtn.style.display = 'block';
            } else {
                elements.selectFilesBtn.textContent = 'تحديد';
                elements.deleteFilesBtn.style.display = 'none';
                elements.selectAllFilesBtn.style.display = 'none';
                elements.deselectAllFilesBtn.style.display = 'none';
                fileModalSelectedFiles.clear(); 
                updateFileListView(); 
            }
        }
        
        function deleteSelectedFiles() {
            if (fileModalSelectedFiles.size === 0) {
                showNotification('لم يتم تحديد أي ملفات للحذف', 'warning');
                return;
            }
            if (!confirm(`هل أنت متأكد من حذف ${fileModalSelectedFiles.size} ملفات؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                return;
            }
            const activeDBType = elements.dbTypeControl.querySelector('.segment.active').dataset.db;
            const dbKey = (activeDBType === 'english') ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const files = Storage.get(dbKey, {});
            let fileWasReset = false;
            for (const filename of fileModalSelectedFiles) {
                delete files[filename]; 
                if (state.selectedFile === filename && state.selectedFileDB === activeDBType) {
                    fileWasReset = true;
                }
            }
            if (fileWasReset) {
                state.selectedFile = null;
                state.selectedFileDB = 'none'; 
                elements.filenameInput.value = 'لم يتم فتح ملف';
                elements.filenameInput.placeholder = 'لم يتم فتح ملف';
                elements.filenameInput.disabled = true;
                cmEditor.setValue('');
                updateStats();
                saveConfig();
            }
            Storage.set(dbKey, files); 
            showNotification(`✅ تم حذف ${fileModalSelectedFiles.size} ملفات بنجاح`);
            toggleSelectMode(); 
        }

        function selectAllFiles() {
            if (!fileModalSelectMode) return;
            const fileItems = elements.fileList.querySelectorAll('.file-item');
            if (fileItems.length === 0) {
                showNotification('لا توجد فصول لتحديدها', 'warning');
                return;
            }
            fileItems.forEach(li => {
                const filename = li.dataset.filename;
                if (filename && !li.classList.contains('selected')) { 
                    fileModalSelectedFiles.add(filename); 
                    li.classList.add('selected');
                    const checkbox = li.querySelector('.file-checkbox');
                    if (checkbox) checkbox.checked = true;
                }
            });
            elements.deleteFilesBtn.textContent = `حذف (${fileModalSelectedFiles.size})`;
        }

        function deselectAllFiles() {
            if (!fileModalSelectMode) return;
            fileModalSelectedFiles.clear(); 
            const fileItems = elements.fileList.querySelectorAll('.file-item');
            fileItems.forEach(li => {
                li.classList.remove('selected');
                const checkbox = li.querySelector('.file-checkbox');
                if (checkbox) checkbox.checked = false;
            });
            elements.deleteFilesBtn.textContent = 'حذف (0)';
        }

        function formatFileDate(timestamp) {
            const now = new Date();
            const fileDate = new Date(timestamp);
            const diffMs = now - fileDate;
            const diffHours = diffMs / (1000 * 60 * 60);

            const timeFormat = fileDate.toLocaleString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            }); 

            if (diffHours < 24) {
                return timeFormat;
            } else {
                const yesterday = new Date(now);
                yesterday.setDate(now.getDate() - 1);
                
                if (yesterday.toDateString() === fileDate.toDateString()) {
                     return `Yesterday at ${timeFormat}`;
                } else {
                    return fileDate.toLocaleDateString('en-US');
                }
            }
        }
        
        function applyInterfaceColor(value) {
            state.interfaceColor = value;
            const gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            const allModals = document.querySelectorAll('.modal-content');
            
            if (value === 'white') {
                document.body.style.background = gradient;
                elements.header.style.background = gradient;
                elements.controls.classList.remove('dark-interface');
                elements.stats.classList.remove('dark-interface');
                allModals.forEach(modal => modal.classList.remove('dark-interface'));
            } else if (value === 'black') {
                document.body.style.background = value;
                elements.header.style.background = value;
                elements.controls.classList.add('dark-interface');
                elements.stats.classList.add('dark-interface');
                allModals.forEach(modal => modal.classList.add('dark-interface'));
            } else { 
                document.body.style.background = value;
                elements.header.style.background = value;
                elements.controls.classList.remove('dark-interface');
                elements.stats.classList.remove('dark-interface');
                allModals.forEach(modal => modal.classList.remove('dark-interface'));
            }
            saveConfig();
        }

        function openColorModal() {
            const colors = {
                'افتراضي': 'white',
                'رمادي': '#DDDDDD',
                'بيج': '#F5F5DC',
                'كريمي': '#FFF8DC',
                'اسود': 'black'
            };
            const colorList = document.getElementById('colorList');
            colorList.innerHTML = '';
            Object.entries(colors).forEach(([name, value]) => {
                const div = document.createElement('div');
                div.className = 'color-item';
                div.style.background = value;
                div.style.color = (value === 'black' || value === 'blue') ? 'white' : 'black';
                div.textContent = name;
                div.addEventListener('click', () => {
                    applyInterfaceColor(value); 
                    showNotification(`✅ تم تغيير لون الواجهة إلى ${name}`);
                    closeColorModal();
                });
                colorList.appendChild(div);
            });
            elements.colorModal.classList.add('show');
        }

        function closeColorModal() {
            elements.colorModal.classList.remove('show');
        }

        function openFindReplaceModal() {
            elements.findReplaceModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.findReplaceModal.classList.add('show');
            document.getElementById('findText').focus();
        }

        function closeFindReplaceModal() {
            elements.findReplaceModal.classList.remove('show');
        }

        function performFindReplace() {
            const findText = document.getElementById('findText').value;
            const replaceText = document.getElementById('replaceText').value;
            if (!findText) {
                showNotification('الرجاء إدخال نص للبحث عنه', 'error');
                return;
            }
            const currentText = cmEditor.getValue();
            const newText = currentText.replace(new RegExp(findText, 'g'), replaceText);
            if (currentText === newText) {
                 showNotification('لم يتم العثور على النص', 'warning');
            } else {
                 cmEditor.setValue(newText);
                 updateStats();
                 showNotification('✅ تم الاستبدال بنجاح');
                 closeFindReplaceModal();
            }
        }

        function openExportZipModal() {
            elements.exportZipModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.exportZipModal.classList.add('show');
        }

        async function startZipExport(dbType) {
            elements.exportZipModal.classList.remove('show'); 
            if (typeof JSZip === 'undefined') {
                showNotification('خطأ: مكتبة (JSZip) غير موجودة.', 'error');
                return;
            }
            const isEnglish = (dbType === 'english');
            const dbKey = isEnglish ? CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS : CONFIG.STORAGE_KEYS.TRANSLATED_CHAPTERS;
            const folderName = isEnglish ? 'English_Chapters' : 'Arabic_Chapters';
            const zipFileName = isEnglish ? 'English_Chapters.zip' : 'Arabic_Chapters.zip';
            const dbFriendlyName = isEnglish ? 'الإنجليزية' : 'المترجمة';
            showNotification(`جاري تحضير ملفات ${dbFriendlyName} للضغط...`, 'warning');
            try {
                const files = Storage.get(dbKey, {});
                const fileNames = Object.keys(files);
                if (fileNames.length === 0) {
                    showNotification(`لا توجد فصول في "${dbFriendlyName}" لتصديرها.`, 'error');
                    return;
                }
                const zip = new JSZip();
                const folder = zip.folder(folderName); 
                for (const filename of fileNames) {
                    const fileData = files[filename];
                    const content = fileData.content || ""; 
                    folder.file(filename, content); 
                }
                showNotification('جاري ضغط الملفات...', 'warning');
                const zipContent = await zip.generateAsync({ 
                    type: "blob",
                    compression: "DEFLATE", 
                    compressionOptions: { level: 9 }
                });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipContent);
                link.download = zipFileName;
                document.body.appendChild(link); 
                link.click(); 
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href); 
                }, 100); 
                showNotification(`✅ تم تصدير ${fileNames.length} فصول بنجاح!`, 'success');
            } catch (err) {
                console.error("خطأ أثناء إنشاء ملف ZIP:", err);
                showNotification('❌ حدث خطأ أثناء إنشاء ملف ZIP.', 'error');
            }
        }
        
        function toggleReadMode() {
            state.readMode = !state.readMode;
            elements.controls.classList.toggle('hidden', state.readMode);
            elements.header.classList.toggle('hidden', state.readMode);
            elements.stats.classList.toggle('hidden', state.readMode);
            elements.exitBtn.classList.toggle('show', state.readMode && !state.fullscreen); 
            if (cmEditor) {
                cmEditor.setOption("readOnly", state.readMode);
                cmEditor.getWrapperElement().classList.toggle('read-only', state.readMode);
            }
        }

        function toggleFullscreen() {
            state.fullscreen = !state.fullscreen;
            elements.header.classList.toggle('hidden', state.fullscreen);
            elements.controls.classList.toggle('hidden', state.fullscreen);
            elements.stats.classList.toggle('hidden', state.fullscreen);
            elements.exitBtn.classList.toggle('show', state.fullscreen); 
            if(state.readMode) {
                 elements.exitBtn.classList.toggle('show', state.fullscreen);
            }
        }

        function exitSpecialMode() {
            if (state.fullscreen) toggleFullscreen(); 
            if (state.readMode) toggleReadMode();
            elements.exitBtn.classList.remove('show');
        }

        function openFontModal() {
            const fonts = [
                { name: 'Geeza Pro (افتراضي)', family: 'Geeza Pro', cssClass: 'font-geeza' },
                { name: 'Cairo (جديد)', family: "'Cairo', sans-serif", cssClass: 'font-cairo' },
                { name: 'Noto Kufi (جديد)', family: "'Noto Kufi Arabic', sans-serif", cssClass: 'font-noto-kufi' },
                { name: 'Amiri (جديد)', family: "'Amiri', serif", cssClass: 'font-amiri' },
                { name: 'Arial', family: 'Arial', cssClass: 'font-arial' },
                { name: 'Times New Roman', family: "'Times New Roman', serif", cssClass: 'font-times' }
            ];
            elements.fontList.innerHTML = ''; 
            fonts.forEach(font => {
                const li = document.createElement('li');
                li.className = `selection-item ${font.cssClass}`;
                li.textContent = font.name;
                if (state.fontName === font.family) {
                    li.classList.add('active');
                }
                li.addEventListener('click', () => {
                    applyFont(font.family);
                    closeFontModal();
                });
                elements.fontList.appendChild(li);
            });
            elements.fontModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.fontModal.classList.add('show');
        }
        function closeFontModal() {
            elements.fontModal.classList.remove('show');
        }

        function openThemeModal() {
            const themes = [
                { name: 'ابيض', value: 'white' },
                { name: 'داكن', value: 'dark' },
                { name: 'ازرق داكن', value: 'blue-dark' }
            ];
            elements.themeList.innerHTML = ''; 
            themes.forEach(theme => {
                const li = document.createElement('li');
                li.className = 'selection-item';
                li.textContent = theme.name;
                if (state.theme === theme.value) {
                    li.classList.add('active');
                }
                li.addEventListener('click', () => {
                    applyTheme(theme.value);
                    closeThemeModal();
                });
                elements.themeList.appendChild(li);
            });
            elements.themeModal.classList.toggle('dark-interface', state.interfaceColor === 'black');
            elements.themeModal.classList.add('show');
        }
        function closeThemeModal() {
            elements.themeModal.classList.remove('show');
        }

        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            
            cmEditor = CodeMirror.fromTextArea(elements.textEditor, {
                lineNumbers: false,
                direction: "rtl",  
                lineWrapping: true, 
                readOnly: state.readMode,
            });

            cmEditor.addOverlay(systemTextOverlay);

            cmEditor.on("change", () => {
                updateStats(); 
                if (autoSaveTimer) clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(() => {
                    saveChanges(true); 
                }, 2000); 
            });
            
            loadConfig(); 

            applyTheme(state.theme);
            applyFont(state.fontName);
            applyFontSize(state.fontSize);
            applyLineSpacing(state.lineSpacing);
            
            // ✅ جديد: تطبيق الـ Overlays المحفوظة
            updateEditorOverlays();

            if(cmEditor) {
                updateStats();
            }
        });