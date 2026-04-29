import anthropic
from config import config
from router.models import RouteConfig

_anthropic_client = None
_openai_client = None
_genai_configured = False


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _anthropic_client


def _get_openai():
    global _openai_client
    if _openai_client is None:
        try:
            import openai
            _openai_client = openai.OpenAI(api_key=config.OPENAI_API_KEY)
        except Exception:
            return None
    return _openai_client


def _configure_genai():
    global _genai_configured
    if not _genai_configured:
        try:
            import google.generativeai as genai
            genai.configure(api_key=config.GOOGLE_API_KEY)
            _genai_configured = True
        except Exception:
            pass


def call_ai(
    system_prompt: str,
    messages: list[dict],
    route: RouteConfig,
) -> str:
    model = route.model

    if model.startswith("claude"):
        return _call_claude(system_prompt, messages, route)
    elif model.startswith("gemini"):
        return _call_gemini(system_prompt, messages, route)
    elif model.startswith("gpt"):
        return _call_openai(system_prompt, messages, route)
    else:
        return _call_claude(system_prompt, messages, route)


def _call_claude(system_prompt: str, messages: list[dict], route: RouteConfig) -> str:
    client = _get_anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=route.max_tokens,
        temperature=route.temperature,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text


def _call_gemini(system_prompt: str, messages: list[dict], route: RouteConfig) -> str:
    try:
        _configure_genai()
        import google.generativeai as genai
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
        )
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat = model.start_chat(history=history)
        last_msg = messages[-1]["content"] if messages else ""
        response = chat.send_message(last_msg)
        return response.text
    except Exception:
        return _call_claude(system_prompt, messages, route)


def _call_openai(system_prompt: str, messages: list[dict], route: RouteConfig) -> str:
    try:
        client = _get_openai()
        if client is None:
            return _call_claude(system_prompt, messages, route)
        all_messages = [{"role": "system", "content": system_prompt}] + messages
        response = client.chat.completions.create(
            model=route.model,
            max_tokens=route.max_tokens,
            temperature=route.temperature,
            messages=all_messages,
        )
        return response.choices[0].message.content or ""
    except Exception:
        return _call_claude(system_prompt, messages, route)
