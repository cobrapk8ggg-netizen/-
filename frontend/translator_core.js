// translator_core.js - الوظائف الأساسية للترجمة


// ====== إدارة المسرد ======

function loadGlossary() {
  const glossary = Storage.get(CONFIG.STORAGE_KEYS.GLOSSARY);
  if (!glossary || !glossary.manual_terms || !glossary.extracted_terms) {
    return { manual_terms: {}, extracted_terms: {} };
  }
  return glossary;
}

function saveGlossary(glossary) {
  return Storage.set(CONFIG.STORAGE_KEYS.GLOSSARY, glossary);
}

// ====== إدارة الفصول ======

function listEnglishChapters() {
  // نقرأ مباشرة من قاعدة بيانات المحرر
  const chapters = Storage.get('zeusEditorFiles', {}); 
  return Object.keys(chapters).sort();
}

function readEnglishChapter(filename) {
  // نقرأ من قاعدة بيانات المحرر
  const chapters = Storage.get('zeusEditorFiles', {});
  // نتأكد من أن الملف موجود وأن له محتوى
  if (chapters[filename] && chapters[filename].content) {
    return chapters[filename].content;
  }
  return '';
}

function saveEnglishChapter(filename, content) {
  const chapters = Storage.get(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS, {});
  chapters[filename] = content;
  return Storage.set(CONFIG.STORAGE_KEYS.ENGLISH_CHAPTERS, chapters);
}

function saveTranslatedChapter(filename, content) {
  const editorFilesKey = 'zeusEditorFiles';
  // نجلب قاعدة بيانات المحرر
  const editorFiles = Storage.get(editorFilesKey, {});
  
  // نحفظ الملف بالتنسيق الجديد الذي يتضمن تاريخ التعديل
  editorFiles[filename] = {
    content: content,
    modified: Date.now()
  };
  
  // نحفظ قاعدة بيانات المحرر المحدثة
  return Storage.set(editorFilesKey, editorFiles);
}

// ====== بناء البرومبت ======

function buildGlossaryPrompt(glossary) {
  const allTerms = {
    ...glossary.manual_terms, // تم تصحيح ...
    ...glossary.extracted_terms // تم تصحيح ...
  };

  if (Object.keys(allTerms).length === 0) {
    return '';
  }

  let lines = ['\n🔒 استخدم هذه الترجمات دائماً للمصطلحات التالية:'];
  for (const [en, ar] of Object.entries(allTerms)) {
    lines.push(`- ${en} → ${ar}`);
  }

  return lines.join('\n');
}

function buildTranslationPrompt(text, glossary) {
  // تم تصحيح علامات التنصيص الثلاثية الخاطئة “””
  return `
أريدك أن تترجم هذا الفصل بأسلوب عربي فصيح وأدبي متقن، ويجب أن يكون السرد متصلًا ومتدفقًا دون أي انقطاع أو تقطيع في المشاهد. إليك التعليمات:

🔒 قواعد التنقية الدينية والأخلاقية (تُطبّق تلقائيًا):
ممنوع تمامًا إدراج أو ترجمة أي محتوى جنسي أو شاذ أو موحٍ بالفاحشة أو أي عبارة تتعارض مع القيم الإسلامية.
عند وجود مشهد من هذا النوع، احذفه كليًا أو استبدله بتلميح عام محترم يحافظ على السياق القصصي دون خوض في تفاصيل محرّمة، مثل:
بدلًا من “مشهد حميم”، تُكتب: “ابتعدت الكاميرا عن المشهد تاركة ما جرى طيّ الكتمان”.
أو “حدث ما لا يُروى، ثم تبدّل كل شيء بعدها.”
يُسمح بوجود العنف، القتال، الدماء، الانتقام، الرعب، المأساة، الظلم، والسواد الدرامي كما هي، دون أي حذف أو تهذيب مبالغ فيه.

🔸 ممنوع تمامًا:

- إبقاء أي كلمة إنجليزية حتى الأسماء أو المصطلحات، **باستثناء الأحرف الدالة على المراتب أو الفئات (A، B، C، S، SS…)** فهي تبقى بالحروف اللاتينية كما هي
- استخدام نقاط التقطيع “…” أو الفواصل غير السردية
- وضع توضيحات بجانب الأسماء
- كتابة الترجمة بأسلوب مقطع أو مشهدي مثل كتابة الفقرات القصيرة أو الانتقال السريع بين الحوارات دون وصل سردي
- استخدام هذه الرموز <> أو أي رمز آخر في الكلام بين الشخصيات أو الحوارات
- استخدام تنسيقات ماركدون كالغامق والمائل وغيرها
- جعل أي فقرة تحتوي على أكثر من 3 إلى 4 جمل متوسطة الطول، فالفقرة الطويلة تُعتبر خطأ في التنسيق ويجب تقسيمها إلى فقرات أدبية أقصر
- لا اريد اي كلمة غير مفهومة ومترابطة وليست من السياق
- ترجمة حرفية بتاتا، لا اريد اي كلمة حرفية وغير مفهومة وغير مناسبة الرواية ( وهي شيانشيا )
- راجع النص مرتين قبل ترجمة اي مصطلح!

🔸 مطلوب بشدة:
\t- اذا كانت رواية فنون قتال، صينية، يجب عليك بتكييف المصطلحات لتناسب سياق قصص الفنون القتالية والخيال الصيني (Xianxia) للحفاظ على روح النص الأصلي.

- أن تكون الترجمة بأسلوب السرد المتدفق المستمر كما في الروايات العربية الكلاسيكية أو الفصول الملحمية
- سرد متصل وجذاب دون تقطيع أو فصل المشاهد
- إعادة صياغة الجمل الركيكة أو غير المفهومة بلغة أدبية واضحة
- تطبيق المسرد حرفيًا عند وجود مصطلحات فيه
- فصل جميع الأسماء التي تكون أكثر من مقطع واحد
- جعل الحوارات (الكلام بين الشخصيات) ضمن علامات الاقتباس “ “ والتفكير ضمن علامات ’ ’
- تقسيم الفقرات بشكل أدبي مريح للعين، بحيث لا تتجاوز كل فقرة 3 إلى 4 جمل متوسطة الطول كحد أقصى
- فصل الفقرات عند تغيّر المتحدث أو تغيّر الانفعال أو انتقال المشهد الزمني
- جعل كل فقرة تحمل فكرة أو إحساسًا واحدًا واضحًا مع الحفاظ على الترابط السردي العام دون تشتيت
- كلام النظام، معروف، الذي فيه دينغ او من السياق، ضعه بداخل هذه القوسين فقط []
- كلام النظام (داخل \`[]\`) يجب أن يكون في سطر خاص به. دون دمج كلام النظام في فقرة واحدة، بمعنى، اذا كان اكثر من كلام للنظام مثل:

[لقد دخلت المحاكاة]
(فراغ)
[تجلس بجوار النافذة ممسكًا بمنديل بط الماندرين المطرز]
(فراغ)
[“اللعنة! هذا الشيء مجددًا؟” تلعن المنديل في سرك]
(فراغ)
مع وضع فراغ بين كل كلام.

🔸 توجيهات خاصة بالمصطلحات الدينية والثقافية :

\t- تجنب الألفاظ الشركية الصريحة: يجب تكييف المصطلحات التي قد تتعارض مع العقيدة الإسلامية.
\t- الألوهية: بدلًا من “إله” (God)، تُستخدم بدائل مثل “الحاكم المطلق”، “السيد الأسمى”، “الكائن المتعالي”، أو “الخالد الأبدي” لوصف الشخصيات فائقة القوة.
\t- الآلهة المتعددة: بدلًا من “آلهة” (Gods/Deities)، تُستخدم مصطلحات مثل “الأسياد السماويون”، “الكائنات الخالدة”، أو “الأرواح العليا”.
\t- العبادة: تُوصف الأفعال مثل الركوع أو السجود كـ “إظهار الإجلال” أو “الانحناء احترامًا” بدلاً من “العبادة” المباشرة، ما لم يكن المعنى لا يستقيم إلا بها.

🔹 بعد الترجمة:

- دقّق النص كاملًا قبل إخراجه.
- تأكد من أن الفقرات متناسقة بصريًا ومتقاربة في الطول دون إفراط في القطع أو الحشو.
- إذا لاحظت أن بعض الفقرات قصيرة جدًا أو غير منسقة، أعد دمجها بلغة أدبية انسيابية حتى تصل لتوازن مثالي بين الجمالية البصرية والانسيابية السردية.
- الهدف النهائي هو ترجمة أدبية متقنة ومريحة للقراءة، خالية من الفقرات الطويلة المرهقة أو القصيرة المبتورة.

🔹 تنسيق رقم وعنوان الفصل:

- يجب أن يكون تنسيق رقم وعنوان الفصل في بداية النص دائمًا على الشكل الآتي:
  
  الفصل الستون: سقوط اللورد
  
____________________________________________ 
  
  (سطر فارغ هنا)
  
  ثم يبدأ محتوى الفصل بعد هذا السطر الفارغ مباشرة.
- حيث يُكتب رقم الفصل بالحروف العربية دائمًا (مثل: الفصل العشرون، الفصل المئة وخمسة عشر…)، ثم نقطتان، ثم عنوان الفصل كما هو مترجم، وبعده سطر يحتوي على الخط الثابت التالي تمامًا:
  
____________________________________________ 

ترجمة عنوان ورقم الفصل توضع فوق محتوى الفصل.

${buildGlossaryPrompt(glossary)}

النص المطلوب ترجمته:
"""${text}"""
`;
}

// ====== دوال الترجمة ======

async function translateWithGoogle(text) {
  const url = '[https://translate.googleapis.com/translate_a/single](https://translate.googleapis.com/translate_a/single)'; // تم تصحيح '
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'ar',
    dt: 't',
    q: text
  });

  try {
    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      signal: AbortSignal.timeout(CONFIG.DEFAULT_TIMEOUT * 1000)
    });

    if (response.ok) {
      const data = await response.json();
      return data[0].map(seg => seg[0]).join('');
    } else {
      throw new Error(`فشل ترجمة جوجل: ${response.status}`);
    }
  } catch (error) {
    console.error('خطأ في ترجمة جوجل:', error);
    throw error;
  }
}

async function translateWithOpenAI(text, glossary, apiKey, model = CONFIG.MODELS.OpenAI) {
  const prompt = buildTranslationPrompt(text, glossary);
  const url = '[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)'; // تم تصحيح '

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(CONFIG.DEFAULT_TIMEOUT * 1000)
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    } else {
      const errorText = await response.text();
      throw new Error(`فشل ترجمة OpenAI: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('خطأ في ترجمة OpenAI:', error);
    throw error;
  }
}

async function translateWithTogether(text, glossary, apiKey, model = CONFIG.MODELS.Together) {
  const prompt = buildTranslationPrompt(text, glossary);
  const url = '[https://api.together.xyz/v1/chat/completions](https://api.together.xyz/v1/chat/completions)'; // تم تصحيح '

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(CONFIG.DEFAULT_TIMEOUT * 1000)
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    } else {
      const errorText = await response.text();
      throw new Error(`فشل ترجمة Together: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('خطأ في ترجمة Together:', error);
    throw error;
  }
}

async function translateWithGemini(text, glossary, apiKey, model = CONFIG.MODELS.Gemini) {
  const prompt = buildTranslationPrompt(text, glossary);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
      signal: AbortSignal.timeout(CONFIG.DEFAULT_TIMEOUT * 1000)
    });

    if (response.ok) {
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } else {
      const errorText = await response.text();
      throw new Error(`فشل ترجمة Gemini: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('خطأ في ترجمة Gemini:', error);
    throw error;
  }
}

// ====== استخراج المصطلحات ======

async function extractTermsWithGemini(englishText, arabicText, apiKey, currentGlossary) {
  // تم تصحيح علامات التنصيص في مثال JSON
  const prompt = `
أنت مساعد خبير في استخراج المصطلحات والأسماء من النصوص المترجمة.
مهمتك هي قراءة النص الإنجليزي وترجمته العربية، ثم استخراج المصطلحات التقنية، أسماء الأعلام (مثل أسماء الأشخاص، الأماكن، المنظمات)، والمفاهيم الرئيسية.

## **ركز بشكل خاص على استخراج المصطلحات التي تندرج تحت الفئات التالية:**

- **مصطلحات الزراعة والتقنيات:** مثل أنواع النباتات، أساليب الزراعة، أدوات وتقنيات زراعية، أمراض النباتات، حلول هندسية زراعية.
- **أسماء المواقع والمقرات:** أسماء المدن، القرى، المناطق الجغرافية، المباني، المقرات الحكومية أو الخاصة، أي موقع ذي أهمية.
- **الشخصيات والرتب الخالدة:** أسماء الأشخاص، الألقاب، الرتب العسكرية أو الاجتماعية، الشخصيات التاريخية أو الخيالية.
- **مفاهيم روحية وزراعية:** المصطلحات الدينية، الفلسفية، الروحية، أو المفاهيم المتعلقة بالزراعة العضوية، الاستدامة، التنوع البيولوجي.

**القواعد:**

- يجب أن يكون كل مصطلح إنجليزي فريدًا.
- يجب أن تكون الكلمات المستخرجة مصطلحات ذات معنى في سياقها.
- تجاهل الكلمات الشائعة أو الحروف أو الأفعال التي لا تمثل مصطلحات.
- قدم النتائج بتنسيق JSON فقط، حيث يكون المفتاح هو المصطلح الإنجليزي والقيمة هي الترجمة العربية المقابلة.
- يجب أن تتطابق الترجمة العربية تمامًا مع الكلمة أو العبارة في النص العربي المعطى.

مثال لتنسيق JSON المطلوب:
{"Artificial Intelligence": "الذكاء الاصطناعي", "New York": "نيويورك", "API Key": "مفتاح API", "Sustainable Agriculture": "الزراعة المستدامة"}

النص الإنجليزي:
"""${englishText}"""

النص العربي:
"""${arabicText}"""

الآن، قدم المصطلحات المستخرجة بتنسيق JSON:
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.MODELS.GeminiFlash}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
      signal: AbortSignal.timeout(CONFIG.DEFAULT_TIMEOUT * 1000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`فشل استخراج المصطلحات: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let responseContent = data.candidates[0].content.parts[0].text;

    // إزالة تنسيق markdown إذا وجد
    if (responseContent.startsWith('```json') && responseContent.endsWith('```')) {
      responseContent = responseContent.slice(7, -3).trim();
    } else if (responseContent.startsWith('```') && responseContent.endsWith('```')) {
      responseContent = responseContent.slice(3, -3).trim();
    }

    const extractedTerms = JSON.parse(responseContent);

    // تصفية المصطلحات المكررة
    const allExistingTerms = {
      ...currentGlossary.manual_terms, // تم تصحيح ...
      ...currentGlossary.extracted_terms // تم تصحيح ...
    };

    const normalizedExisting = {};
    for (const [en, ar] of Object.entries(allExistingTerms)) {
      normalizedExisting[en.toLowerCase()] = ar.toLowerCase();
    }

    const newTerms = {};
    for (const [en, ar] of Object.entries(extractedTerms)) {
      const normalizedEn = en.toLowerCase();
      const normalizedAr = ar.toLowerCase();

      let isDuplicate = false;

      // فحص التطابق الإنجليزي
      if (normalizedExisting[normalizedEn]) {
        isDuplicate = true;
      } else {
        // فحص التشابه
        for (const existingEn of Object.keys(normalizedExisting)) {
          if (normalizedEn.includes(existingEn) || existingEn.includes(normalizedEn)) {
            isDuplicate = true;
            break;
          }
        }
      }

      // فحص التطابق العربي
      if (!isDuplicate) {
        for (const existingAr of Object.values(normalizedExisting)) {
          // تم تصحيح المسافة الخاطئة
          if (normalizedAr === existingAr ||
            normalizedAr.includes(existingAr) ||
            existingAr.includes(normalizedAr)) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        newTerms[en] = ar;
      }
    }

    // تحديث المسرد
    const updatedGlossary = {
      ...currentGlossary, // تم تصحيح ...
      extracted_terms: {
        ...currentGlossary.extracted_terms, // تم تصحيح ...
        ...newTerms // تم تصحيح ...
      }
    };

    return { glossary: updatedGlossary, newTerms };

  } catch (error) {
    console.error('خطأ في استخراج المصطلحات:', error);
    throw error;
  }
}
