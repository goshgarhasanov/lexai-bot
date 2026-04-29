MEMORY_TEMPLATE = """<memory_management>
SÖHBƏT TARİXİ VƏ KONTEKSTİ:

İstifadəçi haqqında bildiklərim:
{user_profile_summary}

Bu söhbətin əsas mövzuları:
{conversation_topics}

Əvvəlki cavablarımda istinad etdiyim maddələr:
{cited_articles}

İstifadəçinin açıqladığı faktlar:
{disclosed_facts}

QAYDA: Bu kontekstdən istifadə edərək ardıcıl, tutarlı cavablar ver.
Əvvəl izah edilmiş məlumatları yenidən izah etmə.
Əgər istifadəçi əvvəlki suala qayıdırsa — "Əvvəl qeyd etdiyimiz kimi..."
ifadəsini işlət.

MƏXFİLİLİK XƏBƏRDARLİĞI:
İstifadəçi şəxsi məlumat paylaşırsa (ad, ünvan, şəxsiyyət nömrəsi) —
bunları cavabında HEÇ VAXT əks etdirmə. Yalnız hüquqi analiz üçün istifadə et.

SÖHBƏT YADDAŞI LİMİTİ:
Son {memory_window} mesaj saxlanılır. Köhnə mesajlar xülasələnir.
</memory_management>"""


def build_memory_context(
    conversation_history: list,
    user_profile_summary: str = "",
    cited_articles: list = None,
    disclosed_facts: list = None,
    memory_window: int = 10,
) -> str:
    if cited_articles is None:
        cited_articles = []
    if disclosed_facts is None:
        disclosed_facts = []

    topics = _extract_topics(conversation_history)

    return MEMORY_TEMPLATE.format(
        user_profile_summary=user_profile_summary or "Məlumat yoxdur",
        conversation_topics=", ".join(topics) if topics else "Yeni söhbət",
        cited_articles=", ".join(cited_articles) if cited_articles else "Hələ istinad edilməyib",
        disclosed_facts="; ".join(disclosed_facts) if disclosed_facts else "Yoxdur",
        memory_window=memory_window,
    )


def _extract_topics(conversation_history: list) -> list[str]:
    legal_topics = {
        "iş": "əmək hüququ",
        "işdən": "əmək hüququ",
        "kirayə": "mülki hüquq",
        "müqavilə": "mülki hüquq",
        "boşanma": "ailə hüququ",
        "miras": "miras hüququ",
        "torpaq": "torpaq hüququ",
        "cinayət": "cinayət hüququ",
        "həbs": "cinayət hüququ",
        "vergi": "vergi hüququ",
        "kredit": "maliyyə hüququ",
    }
    found_topics = set()
    for msg in conversation_history:
        content = msg.get("content", "").lower() if isinstance(msg, dict) else ""
        for keyword, topic in legal_topics.items():
            if keyword in content:
                found_topics.add(topic)
    return list(found_topics)


def format_messages_for_api(conversation_history: list, memory_window: int = 10) -> list:
    recent = conversation_history[-memory_window * 2:]
    return [
        {"role": msg["role"], "content": msg["content"]}
        for msg in recent
        if msg.get("role") in ("user", "assistant")
    ]
