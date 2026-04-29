from datetime import date

from prompts.identity import IDENTITY_PROMPT, FORMAT_INSTRUCTIONS
from prompts.subscription import build_subscription_context
from prompts.rag_template import NO_RAG_FALLBACK
from prompts.safety import SAFETY_LAYER, STANDARD_FOOTER
from prompts.memory import build_memory_context
from prompts.document import build_document_prompt, detect_document_type


def build_system_prompt(
    user,
    rag_context: str = "",
    conversation_history: list = None,
    document_mode: bool = False,
    user_message: str = "",
) -> str:
    if conversation_history is None:
        conversation_history = []

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
