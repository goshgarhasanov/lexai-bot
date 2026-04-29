import json
import re
import anthropic

from config import config
from router.models import ROUTING_RULES, RouteConfig

ROUTER_SYSTEM_PROMPT = """
Sən hüquqi sorğu analiz edən router-sən. İstifadəçinin mesajını oxu və
YALNIZ aşağıdakı kateqoriyalardan BİRİNİ seç:

KATEQORİYALAR:
- simple_definition: Termin izahı, sadə sual
- deep_legal_analysis: Mürəkkəb hüquqi məsələ, strateji analiz
- document_drafting: Sənəd, müqavilə, ərizə hazırlanması
- case_research: Məhkəmə praktikası, presedent axtarışı
- quick_check: Müddət, tarix, riyazi hesablama
- sentiment_crisis: İstifadəçi stress altında, emosional vəziyyət

CAVAB FORMATI (yalnız JSON, heç bir izahat olmadan):
{
  "category": "kateqoriya_adı",
  "confidence": 0.0-1.0,
  "language": "az|ru|en",
  "urgency": "low|medium|high",
  "topics": ["hüquq sahəsi 1", "hüquq sahəsi 2"],
  "requires_rag": true|false
}

QAYDA: Əgər söz "işdən çıxarılmaq", "həbs", "boşanmaq", "ev satışı",
"müqavilə pozulması", "şikayət" varsa — urgency = "high" seç.
"""

_HIGH_URGENCY_WORDS = [
    "işdən çıxarıl", "həbs", "boşan", "ev sat", "müqavilə pozul", "şikayət",
    "zorakılıq", "döy", "tutulma", "cinayət",
]


class QueryRouter:
    def __init__(self):
        self._client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    def classify(self, user_message: str) -> dict:
        try:
            response = self._client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=200,
                system=ROUTER_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = response.content[0].text.strip()
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return self._fallback_classify(user_message)

    def get_route_config(self, user_message: str) -> tuple[dict, RouteConfig]:
        classification = self.classify(user_message)
        category = classification.get("category", "deep_legal_analysis")
        route = ROUTING_RULES.get(category, ROUTING_RULES["deep_legal_analysis"])
        return classification, route

    @staticmethod
    def _fallback_classify(message: str) -> dict:
        msg_lower = message.lower()
        urgency = "high" if any(w in msg_lower for w in _HIGH_URGENCY_WORDS) else "low"

        if any(w in msg_lower for w in ["sənəd", "ərizə", "müqavilə yaz", "hazırla"]):
            category = "document_drafting"
        elif any(w in msg_lower for w in ["nədir", "nə deməkdir", "izah et"]):
            category = "simple_definition"
        elif any(w in msg_lower for w in _HIGH_URGENCY_WORDS):
            category = "sentiment_crisis"
        else:
            category = "deep_legal_analysis"

        return {
            "category": category,
            "confidence": 0.6,
            "language": "az",
            "urgency": urgency,
            "topics": [],
            "requires_rag": True,
        }


router = QueryRouter()
