import io
import logging
import google.generativeai as genai
from config import config

logger = logging.getLogger(__name__)

_TRANSCRIBE_PROMPT = (
    "Bu audio faylı tam dəqiqliklə mətнə çevir. "
    "Yalnız deyilənləri yaz, heç bir izahat əlavə etmə. "
    "Dil: Azərbaycan, Rus və ya İngilis ola bilər — hansı dildə danışılıbsa o dildə yaz."
)


async def transcribe_voice(file_bytes: bytes, language: str = "az") -> str | None:
    """
    Gemini 1.5 Flash ilə ses faylını mətнə çevirir.
    Ayrıca API açarı tələb etmir — mövcud GOOGLE_API_KEY istifadə olunur.
    """
    if not config.GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY təyin edilməyib")
        return None

    try:
        genai.configure(api_key=config.GOOGLE_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        audio_part = {
            "mime_type": "audio/ogg",
            "data": file_bytes,
        }

        response = model.generate_content([_TRANSCRIBE_PROMPT, audio_part])
        transcript = response.text.strip() if response.text else None

        if transcript:
            logger.info(f"Gemini transcript [{language}]: {transcript[:120]}")
        return transcript

    except Exception as e:
        logger.error(f"Gemini transcription error: {e}", exc_info=True)
        return None
