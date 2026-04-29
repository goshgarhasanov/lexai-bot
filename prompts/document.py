DOCUMENT_GENERATION_PROMPT = """<document_generation>
[YALNIZ plan_level >= 2 üçün aktiv]

SƏN İNDİ SƏNƏD YAZIRSAN. Bu rejimə keçdiyin zaman:

SƏNƏD TİPİ: {document_type}
  • işdən_çıxarma_şikayəti
  • kirayə_müqaviləsi
  • boşanma_ərizəsi
  • miras_iddiası
  • istehlakçı_şikayəti
  • torpaq_mübahisəsi_iddiası

MƏLUMATLAR:
{extracted_user_data}

SƏNƏD FORMATI QAYDALARİ:
1. Azərbaycan Respublikasının rəsmi sənəd formatını istifadə et
2. Başlıq: "AZƏRBAYCAN RESPUBLİKASI [İNSTİTUSİYA ADI]"
3. İstinad olunan qanun maddələrini mütləq əlavə et
4. Tarix: {current_date} formatında
5. İstifadəçinin məlumatlarını [İSTİFADƏÇİ_ADI] formatında placeholder kimi qoy
6. Sənədin sonunda: "Əlavə: [Lazımi sənədlər siyahısı]"

ÇIXIŞ FORMATI:
```document
[BAŞLIQ]

[ÜNVAN BLOKİ]

[ƏSAS MƏTN - maddə istinadları ilə]

[İMZA BLOKİ]

[ƏLAVƏLƏR]
```

QEYD: Sənədi tamamladıqdan sonra istifadəçiyə de:
"📄 Sənəd hazırdır. Aşağıdakıları nəzərə alın:
 1. [İSTİFADƏÇİ_ADI] hissəsini öz adınızla doldurun
 2. Notariat təsdiqi lazım ola bilər
 3. Göndərməzdən əvvəl hüquqşünas yoxlamasını tövsiyə edirik"
</document_generation>"""

DOCUMENT_TYPES = {
    "işdən_çıxarma_şikayəti": "İşdən Çıxarılma ilə Əlaqədar Şikayət",
    "kirayə_müqaviləsi": "Kirayə Müqaviləsi",
    "boşanma_ərizəsi": "Boşanma Ərizəsi",
    "miras_iddiası": "Miras İddianamə",
    "istehlakçı_şikayəti": "İstehlakçı Şikayəti",
    "torpaq_mübahisəsi_iddiası": "Torpaq Mübahisəsi İddianaməsi",
}

DOCUMENT_KEYWORDS = {
    "işdən_çıxarma_şikayəti": ["işdən çıxar", "ixtisar", "xitam", "əmək mübahisəsi"],
    "kirayə_müqaviləsi": ["kirayə", "icarə", "ev", "mənzil"],
    "boşanma_ərizəsi": ["boşanma", "boşan", "nikah pozulması"],
    "miras_iddiası": ["miras", "vərəsə", "vəsiyyət"],
    "istehlakçı_şikayəti": ["istehlakçı", "alış", "malın qüsuru", "geri qaytarma"],
    "torpaq_mübahisəsi_iddiası": ["torpaq", "yer", "sahə", "həcm"],
}


def detect_document_type(text: str) -> str | None:
    text_lower = text.lower()
    for doc_type, keywords in DOCUMENT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return doc_type
    return None


def build_document_prompt(document_type: str, user_data: str, current_date: str) -> str:
    return DOCUMENT_GENERATION_PROMPT.format(
        document_type=document_type,
        extracted_user_data=user_data,
        current_date=current_date,
    )
