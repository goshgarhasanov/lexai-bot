RAG_TEMPLATE = """<legal_context>
[SYSTEM: Aşağıdakı Azərbaycan qanun maddələri verilənlər bazasından avtomatik tapılmışdır.
Bu mənbələr e-qanun.az, lex.az və rəsmi dövlət qaynaqlarından götürülmüşdür.
Bu məlumatları cavabının əsası kimi istifadə et. Əgər bu maddələr suala tam cavab vermirsə,
bunu açıq qeyd et.]

TAPILMIŞ HÜQUQİ NORMALAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
{rag_results}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

MƏNBƏ METADANİ:
- Qanun: {law_name}
- Maddə nömrəsi: {article_number}
- Son yenilənmə: {last_updated}
- Rəsmi mənbə URL: {source_url}
- Oxşarlıq skoru: {similarity_score}/1.00

{low_score_warning}
</legal_context>"""

NO_RAG_FALLBACK = """<fallback_notice>
[SİSTEM: Verilənlər bazasından uyğun maddə tapılmadı.
Ümumi hüquqi bilikdən istifadə edirsən. Bu faktı cavabda qeyd et.]
</fallback_notice>"""


def format_rag_entry(match) -> str:
    score = round(match.score, 2)
    low_score_warning = (
        "Qeyd: Tapılan maddə tam uyğun olmaya bilər, ehtiyatla istifadə et"
        if score < 0.75 else ""
    )
    return RAG_TEMPLATE.format(
        rag_results=match.metadata.get("text", ""),
        law_name=match.metadata.get("law_name", "Naməlum"),
        article_number=match.metadata.get("article_number", "—"),
        last_updated=match.metadata.get("updated_at", "—"),
        source_url=match.metadata.get("source_url", "e-qanun.az"),
        similarity_score=score,
        low_score_warning=low_score_warning,
    )
