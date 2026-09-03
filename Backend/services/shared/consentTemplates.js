/**
 * CONSENT TEXT TEMPLATES — the exact wording a patient signs.
 *
 * WHERE THEY LIVE AND WHY HERE, not in the database:
 * ClinicalMaster.documentationTemplates exists but is a form-BUILDER shape
 * ({ sections: [{ fields }] }) with no CRUD endpoints and no UI — it is
 * dormant. Bending it to hold consent prose would mean building an editor for
 * it as well.
 *
 * More importantly, consent wording is legally significant. Keeping it in
 * source means a change is reviewed, diffed and deployed deliberately, rather
 * than being editable at runtime by anyone holding an owner login. That is a
 * feature for consent, not a limitation.
 *
 * TO EDIT: change the text here and BUMP `version` for that procedure. Signed
 * consents record the version and a hash of the exact text they were shown, so
 * editing a template can never rewrite what a patient already agreed to.
 *
 * Translations are provided for on-screen review. The generated PDF is English
 * only — jsPDF core fonts cannot render Arabic/Urdu glyphs (the same known
 * limitation as the prescription and invoice PDFs), and the UI says so when a
 * non-English consent was displayed.
 */

export const PROCEDURE_TYPES = Object.freeze([
  "extraction",
  "root_canal",
  "implant",
  "surgery",
  "crown",
  "whitening",
  "other",
]);

const T = (version, en, ur, ar) => ({ version, en, ur, ar });

export const CONSENT_TEMPLATES = Object.freeze({
  extraction: T(
    1,
    "I consent to the extraction of the tooth/teeth identified by my dentist. The procedure, its purpose and the alternatives have been explained to me. I understand the recognised risks, which include bleeding, swelling, bruising, infection, dry socket, damage to adjacent teeth or restorations, sinus communication for upper teeth, and temporary or, rarely, permanent numbness of the lip, chin or tongue. I understand that an unforeseen condition may require a different or additional procedure, and I authorise my dentist to use professional judgement should that arise. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں اپنے ڈینٹسٹ کے بتائے ہوئے دانت/دانتوں کے نکالنے پر رضامندی دیتا/دیتی ہوں۔ طریقہ کار، اس کا مقصد اور متبادل مجھے سمجھا دیے گئے ہیں۔ میں تسلیم شدہ خطرات سمجھتا/سمجھتی ہوں جن میں خون بہنا، سوجن، نیل، انفیکشن، ڈرائی ساکٹ، ملحقہ دانتوں کو نقصان، اوپری دانتوں میں سائنس کا رابطہ، اور ہونٹ، ٹھوڑی یا زبان کا عارضی یا شاذ و نادر مستقل سن ہونا شامل ہے۔ میں سمجھتا/سمجھتی ہوں کہ غیر متوقع صورتحال میں مختلف یا اضافی طریقہ کار درکار ہو سکتا ہے۔ مجھے سوالات پوچھنے کا موقع دیا گیا اور تسلی بخش جواب دیے گئے۔",
    "أوافق على خلع السن/الأسنان التي حددها طبيب الأسنان. شُرح لي الإجراء والغرض منه والبدائل المتاحة. أفهم المخاطر المعروفة، ومنها النزيف والتورم والكدمات والعدوى والسنخ الجاف وتضرر الأسنان أو الحشوات المجاورة واحتمال حدوث اتصال جيبي في الأسنان العلوية وتنميل مؤقت أو نادراً دائم في الشفة أو الذقن أو اللسان. أفهم أن حالة غير متوقعة قد تستلزم إجراءً مختلفاً أو إضافياً. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  root_canal: T(
    1,
    "I consent to root canal (endodontic) treatment of the tooth identified by my dentist. I understand the aim is to save a tooth that would otherwise require extraction, and that success cannot be guaranteed. I understand the recognised risks, which include persistent or returning infection requiring retreatment or extraction, fracture of the tooth or of an instrument within the canal, perforation of the root, post-operative discomfort, and discolouration. I understand that the tooth will usually require a crown afterwards to protect it, at additional cost. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں اپنے ڈینٹسٹ کے بتائے ہوئے دانت کے روٹ کینال علاج پر رضامندی دیتا/دیتی ہوں۔ میں سمجھتا/سمجھتی ہوں کہ مقصد اس دانت کو بچانا ہے جسے بصورت دیگر نکالنا پڑتا، اور کامیابی کی ضمانت نہیں دی جا سکتی۔ خطرات میں انفیکشن کا برقرار رہنا یا واپس آنا، دانت یا آلے کا ٹوٹنا، جڑ میں سوراخ، بعد از علاج تکلیف، اور رنگت کی تبدیلی شامل ہے۔ میں سمجھتا/سمجھتی ہوں کہ عموماً بعد میں تاج (کراؤن) درکار ہوگا جس کی الگ لاگت ہے۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على علاج قناة الجذر للسن الذي حدده طبيب الأسنان. أفهم أن الهدف هو إنقاذ سن كان سيتطلب الخلع، وأن النجاح غير مضمون. أفهم المخاطر المعروفة، ومنها استمرار العدوى أو عودتها بما يستلزم إعادة العلاج أو الخلع، وكسر السن أو أداة داخل القناة، وثقب الجذر، وألم بعد العملية، وتغير اللون. أفهم أن السن سيحتاج عادةً إلى تاج لحمايته بتكلفة إضافية. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  implant: T(
    1,
    "I consent to the placement of a dental implant. The procedure, the expected number of visits and the alternatives have been explained to me. I understand the recognised risks, which include infection, failure of the implant to integrate with the bone, the need for bone grafting, injury to adjacent teeth or nerves, sinus involvement for upper implants, and altered sensation. I understand that implant treatment takes place over several months, that it requires ongoing oral hygiene and review, and that smoking and uncontrolled diabetes materially reduce success. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں ڈینٹل امپلانٹ لگانے پر رضامندی دیتا/دیتی ہوں۔ طریقہ کار، متوقع وزٹس اور متبادل مجھے سمجھا دیے گئے ہیں۔ خطرات میں انفیکشن، امپلانٹ کا ہڈی کے ساتھ نہ جڑنا، ہڈی کی پیوندکاری کی ضرورت، ملحقہ دانتوں یا اعصاب کو نقصان، اوپری امپلانٹس میں سائنس کا معاملہ، اور احساس کی تبدیلی شامل ہے۔ میں سمجھتا/سمجھتی ہوں کہ علاج کئی ماہ پر محیط ہے، مسلسل صفائی اور معائنہ درکار ہے، اور تمباکو نوشی و بے قابو ذیابیطس کامیابی کو نمایاں طور پر کم کرتی ہے۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على زراعة سن. شُرح لي الإجراء وعدد الزيارات المتوقع والبدائل. أفهم المخاطر المعروفة، ومنها العدوى وفشل اندماج الزرعة مع العظم والحاجة إلى ترقيع عظمي وإصابة الأسنان أو الأعصاب المجاورة وتأثر الجيب الأنفي في الزرعات العلوية وتغير الإحساس. أفهم أن العلاج يمتد عدة أشهر ويتطلب عناية ومتابعة مستمرة، وأن التدخين والسكري غير المنضبط يقللان النجاح بدرجة كبيرة. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  surgery: T(
    1,
    "I consent to the oral surgical procedure explained to me by my dentist, including the administration of local anaesthetic. I understand the recognised risks, which include bleeding, swelling, bruising, infection, pain, restricted mouth opening, injury to adjacent structures, and temporary or, rarely, permanent altered sensation. I understand that an unforeseen condition may require a different or additional procedure, and I authorise my dentist to use professional judgement should that arise. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں اپنے ڈینٹسٹ کے سمجھائے گئے اورل سرجیکل طریقہ کار پر، بشمول لوکل اینستھیزیا، رضامندی دیتا/دیتی ہوں۔ خطرات میں خون بہنا، سوجن، نیل، انفیکشن، درد، منہ کھلنے میں کمی، ملحقہ ساخت کو نقصان، اور عارضی یا شاذ و نادر مستقل احساس کی تبدیلی شامل ہے۔ میں سمجھتا/سمجھتی ہوں کہ غیر متوقع صورتحال میں مختلف یا اضافی طریقہ کار درکار ہو سکتا ہے۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على الإجراء الجراحي الفموي الذي شرحه لي طبيب الأسنان، بما في ذلك التخدير الموضعي. أفهم المخاطر المعروفة، ومنها النزيف والتورم والكدمات والعدوى والألم ومحدودية فتح الفم وإصابة التراكيب المجاورة وتغير الإحساس مؤقتاً أو نادراً بشكل دائم. أفهم أن حالة غير متوقعة قد تستلزم إجراءً مختلفاً أو إضافياً. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  crown: T(
    1,
    "I consent to the preparation and fitting of a crown, bridge or other fixed restoration. I understand that the tooth must be reshaped, that this is irreversible, and that a temporary restoration will be worn between visits. I understand the recognised risks, which include sensitivity, the need for root canal treatment if the nerve becomes irritated, loosening or fracture of the restoration, and that the shade may not match adjacent teeth exactly. I understand that a temporary restoration may come loose and that I should contact the clinic if it does. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں کراؤن، برج یا دیگر فکسڈ بحالی کی تیاری اور تنصیب پر رضامندی دیتا/دیتی ہوں۔ میں سمجھتا/سمجھتی ہوں کہ دانت کو تراشنا ہوگا، یہ ناقابلِ واپسی ہے، اور وزٹس کے درمیان عارضی بحالی لگائی جائے گی۔ خطرات میں حساسیت، اعصاب متاثر ہونے پر روٹ کینال کی ضرورت، بحالی کا ڈھیلا ہونا یا ٹوٹنا، اور رنگت کا مکمل مطابقت نہ رکھنا شامل ہے۔ عارضی بحالی ڈھیلی ہو تو کلینک سے رابطہ کروں گا/گی۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على تحضير وتركيب تاج أو جسر أو ترميم ثابت آخر. أفهم أنه يجب إعادة تشكيل السن وأن ذلك لا رجعة فيه، وأنه سيتم تركيب ترميم مؤقت بين الزيارات. أفهم المخاطر المعروفة، ومنها الحساسية والحاجة إلى علاج قناة الجذر إذا تهيج العصب وارتخاء الترميم أو كسره وعدم تطابق اللون تماماً مع الأسنان المجاورة. أفهم أن الترميم المؤقت قد يسقط وأن عليّ الاتصال بالعيادة. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  whitening: T(
    1,
    "I consent to tooth whitening treatment. I understand that results vary between individuals and cannot be guaranteed, and that existing fillings, crowns and veneers will NOT whiten and may need replacing afterwards to match, at additional cost. I understand the recognised risks, which include temporary tooth sensitivity and gum irritation. I confirm I am not pregnant or breastfeeding. I understand that whitening is a cosmetic procedure and that results fade over time, requiring maintenance. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں دانتوں کی سفیدی کے علاج پر رضامندی دیتا/دیتی ہوں۔ میں سمجھتا/سمجھتی ہوں کہ نتائج ہر فرد میں مختلف ہوتے ہیں اور ضمانت نہیں دی جا سکتی، اور موجودہ فلنگز، کراؤن اور وینیئر سفید نہیں ہوں گے اور بعد میں مطابقت کے لیے تبدیل کرنے پڑ سکتے ہیں جس کی الگ لاگت ہے۔ خطرات میں عارضی حساسیت اور مسوڑھوں کی جلن شامل ہے۔ میں تصدیق کرتا/کرتی ہوں کہ میں حاملہ یا دودھ پلانے والی نہیں ہوں۔ یہ کاسمیٹک علاج ہے اور نتائج وقت کے ساتھ کم ہوتے ہیں۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على علاج تبييض الأسنان. أفهم أن النتائج تختلف من شخص لآخر ولا يمكن ضمانها، وأن الحشوات والتيجان والقشور الحالية لن تُبيَّض وقد تحتاج إلى استبدال لاحقاً لتتطابق بتكلفة إضافية. أفهم المخاطر المعروفة، ومنها حساسية مؤقتة في الأسنان وتهيج اللثة. أؤكد أنني لست حاملاً أو مرضعة. أفهم أن التبييض إجراء تجميلي وأن النتائج تتلاشى مع الوقت وتحتاج إلى صيانة. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
  other: T(
    1,
    "I consent to the dental procedure explained to me by my dentist. The nature and purpose of the treatment, its risks and benefits, and the alternatives including no treatment have been explained to me in terms I understand. I understand that an unforeseen condition may require a different or additional procedure, and I authorise my dentist to use professional judgement should that arise. I have had the opportunity to ask questions and they have been answered to my satisfaction.",
    "میں اپنے ڈینٹسٹ کے سمجھائے گئے ڈینٹل طریقہ کار پر رضامندی دیتا/دیتی ہوں۔ علاج کی نوعیت و مقصد، خطرات و فوائد، اور متبادل بشمول علاج نہ کروانا مجھے قابلِ فہم انداز میں سمجھا دیے گئے ہیں۔ میں سمجھتا/سمجھتی ہوں کہ غیر متوقع صورتحال میں مختلف یا اضافی طریقہ کار درکار ہو سکتا ہے۔ مجھے سوالات کا موقع دیا گیا اور تسلی بخش جواب ملے۔",
    "أوافق على إجراء الأسنان الذي شرحه لي طبيب الأسنان. شُرحت لي طبيعة العلاج والغرض منه ومخاطره وفوائده والبدائل بما فيها عدم العلاج بعبارات أفهمها. أفهم أن حالة غير متوقعة قد تستلزم إجراءً مختلفاً أو إضافياً. أُتيحت لي فرصة طرح الأسئلة وأُجيب عنها بما يرضيني."
  ),
});

export const isProcedureType = (v) => PROCEDURE_TYPES.includes(String(v || "").trim());

/** The exact text + version for a procedure in one language. */
export function getConsentTemplate(procedureType, lang = "en") {
  const key = isProcedureType(procedureType) ? String(procedureType).trim() : "other";
  const tpl = CONSENT_TEMPLATES[key];
  const language = ["en", "ur", "ar"].includes(lang) ? lang : "en";
  return { procedureType: key, version: tpl.version, language, text: tpl[language] };
}

/** Every template, for the UI picker. */
export function listConsentTemplates(lang = "en") {
  return PROCEDURE_TYPES.map((p) => getConsentTemplate(p, lang));
}
