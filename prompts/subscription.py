SUBSCRIPTION_TEMPLATE = """<subscription_context>
İSTİFADƏÇİ PROFİLİ:
- İstifadəçi ID: {user_id}
- Abunəlik planı: {plan_name}
- Plan səviyyəsi: {plan_level}  [FREE=0, BASIC=1, PRO=2, FIRM=3]
- Bu ay istifadə edilən sorğu sayı: {queries_used}/{queries_limit}
- Hesab yaradılma tarixi: {account_created}
- Dil tərcihi: {language}

PLANA GÖRƏ DAVRANMA QAYDANİ:
{plan_rules}
</subscription_context>"""

FREE_RULES = """[PLAN: FREE]
  - Yalnız ümumi izahat ver, spesifik hüquqi rəy vermə
  - Cavabı qısa tut (maksimum 200 söz)
  - Hər cavabın sonunda "PRO plana keç — daha ətraflı analiz al" mesajı əlavə et
  - Sənəd hazırlama funksiyasını göstər amma aktivləşdirmə:
    "Bu funksiya PRO planda mövcuddur"
  - Cavabın sonuna ekle: "⚠️ Pulsuz planda {remaining} sorğu qalıb" """

BASIC_RULES = """[PLAN: BASIC]
  - Tam hüquqi analiz ver, maddə istinadları ilə
  - Cavab uzunluğu: 400-600 söz
  - Sənəd şablonlarına baxış icazəsi var (amma redaktə yox)
  - Məhkəmə praktikasına istinad et"""

PRO_RULES = """[PLAN: PRO]
  - Dərin, ekspert səviyyəli hüquqi analiz ver
  - Sənəd hazırlama: AKTIV (ərizə, müqavilə, şikayət)
  - Məhkəmə strategiyası tövsiyəsi ver
  - Alternativ hüquqi yolları analiz et
  - Oxşar məhkəmə işlərinə istinad et
  - Xərc-fayda analizi: "Bu yolu seçsən, təxmini xərc X AZN, müddət Y ay"
  - Prioritet cavab (response time < 5 saniyə)"""

FIRM_RULES = """[PLAN: LAW FIRM]
  - Bütün PRO funksiyaları + API çıxışı
  - Toplu sənəd emalı
  - Cavabı JSON formatında da ver (API inteqrasiyası üçün)
  - Müştəri idarəetmə sistemi inteqrasiyası
  - Xüsusi sistem promptu konfiqurasiyası"""

PLAN_RULES_MAP = {
    0: FREE_RULES,
    1: BASIC_RULES,
    2: PRO_RULES,
    3: FIRM_RULES,
}


def build_subscription_context(user) -> str:
    from config import config

    limit = config.PLAN_LIMITS.get(user.plan_level, 5)
    limit_display = "limitsiz" if limit == -1 else str(limit)
    remaining = max(0, limit - user.queries_used) if limit != -1 else "limitsiz"

    plan_rules = PLAN_RULES_MAP.get(user.plan_level, FREE_RULES)
    if user.plan_level == 0:
        plan_rules = plan_rules.format(remaining=remaining)

    return SUBSCRIPTION_TEMPLATE.format(
        user_id=user.telegram_id,
        plan_name=user.plan_name,
        plan_level=user.plan_level,
        queries_used=user.queries_used,
        queries_limit=limit_display,
        account_created=user.created_at.strftime("%d.%m.%Y") if user.created_at else "—",
        language=user.language or "az",
        plan_rules=plan_rules,
    )
