import io
import logging
from config import config

logger = logging.getLogger(__name__)


async def transcribe_voice(file_bytes: bytes, language: str = "az") -> str | None:
    """
    OpenAI Whisper-1 ilə ses faylını mətнə çevirir.
    Azərbaycan, Rus, İngilis dillərini dəstəkləyir.
    """
    if not config.OPENAI_API_KEY or config.OPENAI_API_KEY == "your_openai_api_key_here":
        logger.warning("OPENAI_API_KEY təyin edilməyib")
        return None

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)

        audio_file = io.BytesIO(file_bytes)
        audio_file.name = "voice.ogg"

        response = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="text",
        )

        transcript = response.strip() if isinstance(response, str) else str(response).strip()
        logger.info(f"Whisper transcript [{language}]: {transcript[:120]}")
        return transcript or None

    except Exception as e:
        logger.error(f"Whisper error: {e}", exc_info=True)
        return None
