from dataclasses import dataclass


@dataclass
class RouteConfig:
    model: str
    reason: str
    max_tokens: int
    temperature: float
    web_search: bool = False
    empathy_mode: bool = False


ROUTING_RULES: dict[str, RouteConfig] = {
    "simple_definition": RouteConfig(
        model="gemini-1.5-flash",
        reason="Sürətli, ucuz, yetərli keyfiyyət",
        max_tokens=500,
        temperature=0.3,
    ),
    "deep_legal_analysis": RouteConfig(
        model="claude-sonnet-4-6",
        reason="Dərin məntiqi analiz, uzun kontekst",
        max_tokens=2000,
        temperature=0.2,
    ),
    "document_drafting": RouteConfig(
        model="claude-sonnet-4-6",
        reason="Strukturlu çıxış, azərbaycan hüquqi dili",
        max_tokens=4000,
        temperature=0.1,
    ),
    "case_research": RouteConfig(
        model="claude-sonnet-4-6",
        reason="Dərin analiz + alıntı",
        max_tokens=1500,
        temperature=0.3,
        web_search=False,
    ),
    "quick_check": RouteConfig(
        model="gpt-4o-mini",
        reason="Riyazi hesablamalar, sürətli",
        max_tokens=300,
        temperature=0.0,
    ),
    "sentiment_crisis": RouteConfig(
        model="claude-sonnet-4-6",
        reason="Empatik cavab, həssas mövzular",
        max_tokens=800,
        temperature=0.4,
        empathy_mode=True,
    ),
}
