SAFETY_LAYER = """<safety_layer>
DİSKLAYMER QAYDASI:
Aşağıdakı hallarda MÜTLƏQ disclaimer əlavə et:

[VƏZIYYƏT 1: Cinayət işi]
Tetikleyici sözlər: həbs, tutulma, cinayət, DIN, müstəntiq, məhkum
Disclaimer: "⚖️ MÜHÜM: Cinayət işlərində dərhal peşəkar vəkil cəlb etmək
            kritik əhəmiyyət daşıyır. Azərbaycan Respublikası Vəkillər
            Kollegiyası: +994 12 492-56-78"

[VƏZIYYƏT 2: Müddətin bitməsi riski]
Tetikleyici sözlər: müddət, son tarix, iddiaərizə, apellyasiya, kassasiya
Disclaimer: "⏰ DİQQƏT: Hüquqi müddətlər buraxılıbsa, tələbinizi itirsəz.
            Bu cür hallarda DƏRHAL hərəkət edin."

[VƏZIYYƏT 3: Ailə zorakılığı]
Tetikleyici sözlər: döymə, zorakılıq, qorxu, hədə, qaçmaq
Disclaimer: "🆘 TƏHLÜKƏSİZLİK: Əgər təhlükə altındaysanız, dərhal
            102 (Polis) və ya 151 (Ailə Zorakılığı Xətti) zəng edin."

[VƏZIYYƏT 4: Böyük məbləğli əqdlər]
Tetikleyici sözlər: mülk, torpaq, ev, miras, kredit, ipoteka
Disclaimer: "💰 TÖVSİYƏ: 10,000 AZN-dən çox olan əqdlər üçün notarial
            təsdiq və peşəkar hüquqi dəstək tövsiyə edilir."
</safety_layer>"""

STANDARD_FOOTER = """
───────────────────────────────────
ℹ️ Bu məlumat hüquqi məsləhət deyil. Konkret vəziyyətiniz üçün
   lisenziyalı vəkilə müraciət edin.
📚 Mənbə: Azərbaycan Respublikasının qanunvericiliyi (e-qanun.az)
───────────────────────────────────"""

CRISIS_KEYWORDS = {
    "criminal": ["həbs", "tutulma", "cinayət", "din", "müstəntiq", "məhkum", "polis"],
    "deadline": ["müddət", "son tarix", "iddiaərizə", "apellyasiya", "kassasiya"],
    "violence": ["döymə", "zorakılıq", "qorxu", "hədə", "qaçmaq"],
    "property": ["mülk", "torpaq", "ev", "miras", "kredit", "ipoteka"],
}

CRISIS_DISCLAIMERS = {
    "criminal": "⚖️ MÜHÜM: Cinayət işlərində dərhal peşəkar vəkil cəlb etmək kritik əhəmiyyət daşıyır. Azərbaycan Respublikası Vəkillər Kollegiyası: +994 12 492-56-78",
    "deadline": "⏰ DİQQƏT: Hüquqi müddətlər buraxılıbsa, tələbinizi itirsəz. Bu cür hallarda DƏRHAL hərəkət edin.",
    "violence": "🆘 TƏHLÜKƏSİZLİK: Əgər təhlükə altındaysanız, dərhal 102 (Polis) və ya 151 (Ailə Zorakılığı Xətti) zəng edin.",
    "property": "💰 TÖVSİYƏ: 10,000 AZN-dən çox olan əqdlər üçün notarial təsdiq və peşəkar hüquqi dəstək tövsiyə edilir.",
}


def get_applicable_disclaimers(text: str) -> list[str]:
    text_lower = text.lower()
    disclaimers = []
    for crisis_type, keywords in CRISIS_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            disclaimers.append(CRISIS_DISCLAIMERS[crisis_type])
    return disclaimers
