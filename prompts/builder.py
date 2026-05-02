import re
from datetime import date

from prompts.identity import IDENTITY_PROMPT, FORMAT_INSTRUCTIONS
from prompts.subscription import build_subscription_context
from prompts.rag_template import NO_RAG_FALLBACK
from prompts.safety import SAFETY_LAYER, STANDARD_FOOTER
from prompts.memory import build_memory_context
from prompts.document import build_document_prompt, detect_document_type

# Prompt injection attack patterns
_INJECT_PATTERNS = re.compile(
    r"<\s*(identity|system|instruction|context|legal_context|memory_management|safety_layer|document_generation)\s*/?>|"
    r"\[SYSTEM\s*:|"
    r"</?\s*(identity|system|instruction)\s*>|"
    r"ignore\s+(previous|all|above)\s+instructions|"
    r"you\s+are\s+now|new\s+persona|forget\s+your\s+instructions",
    re.IGNORECASE,
)

MAX_USER_MESSAGE_LENGTH = 4000


def sanitize_user_input(text: str) -> str:
    """Strip prompt injection patterns and enforce length limit."""
    if not text:
        return text
    text = text[:MAX_USER_MESSAGE_LENGTH]
    text = _INJECT_PATTERNS.sub("[filtered]", text)
    return text


def build_system_prompt(
    user,
    rag_context: str = "",
    conversation_history: list = None,
    document_mode: bool = False,
    user_message: str = "",
) -> str:
    if conversation_history is None:
        conversation_history = []

    user_message = sanitize_user_input(user_message)

    subscription_ctx = build_subscription_context(user)
    memory_ctx = build_memory_context(conversation_history)
    rag_section = rag_context if rag_context else NO_RAG_FALLBACK

    doc_section = ""
    if document_mode and user.plan_level >= 2:
        doc_type = detect_document_type(user_message) or "kirayə_müqaviləsi"
        doc_section = build_document_prompt(
            document_type=doc_type,
            user_data="[İstifadəçidən alınacaq məlumatlar]",
            current_date=date.today().strftime("%d.%m.%Y"),
        )

    return f"""{IDENTITY_PROMPT}

{subscription_ctx}

{memory_ctx}

{rag_section}

{doc_section}

{SAFETY_LAYER}

{FORMAT_INSTRUCTIONS}

STANDART FOOTER:
{STANDARD_FOOTER}
""".strip()
