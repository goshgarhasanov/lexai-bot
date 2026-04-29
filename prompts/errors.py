ERROR_PROMPTS = {
    "no_rag_results": (
        "Sənin sualına uyğun Azərbaycan qanunvericiliyindən konkret maddə tapa bilmədim.\n\n"
        "ETDIYIM: Ümumi hüquqi biliklərə əsaslanaraq cavab verirəm.\n"
        "QEYD: Bu cavab verilənlər bazasından deyil, öyrənilmiş bilikdən qaynaqlanır.\n\n"
        "📌 Daha dəqiq məlumat üçün: e-qanun.az saytını birbaşa yoxlayın."
    ),

    "query_limit_reached": (
        "Salam! Bu ay {plan_name} planınızdakı {limit} sorğu limitinə çatdınız.\n\n"
        "🔓 Limitinizi artırmaq üçün:\n"
        "├── PRO Plan: 24.99$/ay — limitsiz sorğu\n"
        "├── BASIC Plan: 9.99$/ay — 100 sorğu/ay\n"
        "└── /upgrade əmrini göndər — 3 dəqiqəyə aktiv olur\n\n"
        "Növbəti ayın 1-dən limitiniz avtomatik yenilənəcək."
    ),

    "ambiguous_question": (
        "Sualınızı tam başa düşmək üçün bir az əlavə məlumat lazımdır:\n\n"
        "Siz soruşursunuz: \"{user_question}\"\n\n"
        "Dəqiqləşdirməyə ehtiyacım var:\n"
        "{clarifying_questions}\n\n"
        "Hansı variant sizə uyğundur? Sadəcə nömrəni yazın (1, 2 və ya 3)."
    ),

    "out_of_scope": (
        "Bu sual Azərbaycan hüququ ilə bağlı deyil, buna görə cavab verə bilmirəm.\n\n"
        "Mən aşağıdakı sahələrdə kömək edə bilərəm:\n"
        "• Mülki hüquq (müqavilə, əmlak, miras)\n"
        "• Əmək hüququ (işdən çıxarılma, maaş)\n"
        "• Ailə hüququ (boşanma, uşaq saxlaması)\n"
        "• Cinayət hüququ (hüquqlarınız, müdafiə)\n"
        "• Torpaq və mülkiyyət hüququ\n"
        "• İnzibati hüquq\n\n"
        "Başqa hüquqi sualınız varsa, məmnuniyyətlə kömək edərəm! ⚖️"
    ),

    "ai_timeout": (
        "Sistemimizdə qısamüddətli texniki problem var.\n"
        "Sorğunuz 30 saniyə sonra avtomatik yenidən işlənəcək.\n\n"
        "Növbəti sorğunuz PULSUZ olacaq (limit hesablanmayacaq).\n"
        "Narahatçılıq üçün üzr istəyirik! 🔧"
    ),

    "document_access_denied": (
        "📄 Sənəd hazırlama funksiyası PRO planda mövcuddur.\n\n"
        "PRO plana keçmək üçün: /upgrade\n"
        "Qiymət: 24.99$/ay — limitsiz sorğu + sənəd hazırlama"
    ),
}


def get_error_message(error_key: str, **kwargs) -> str:
    template = ERROR_PROMPTS.get(error_key, "Bilinməyən xəta baş verdi. Yenidən cəhd edin.")
    try:
        return template.format(**kwargs)
    except KeyError:
        return template
