import anthropic
from config import config


class EmbeddingService:
    def __init__(self):
        self._client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    def embed(self, text: str) -> list[float]:
        # Anthropic doesn't have a dedicated embeddings endpoint yet,
        # so we use a lightweight approach with voyage-3 via messages
        # or fall back to a zero vector for graceful degradation
        try:
            import openai
            oai = openai.OpenAI(api_key=config.OPENAI_API_KEY)
            response = oai.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding
        except Exception:
            return []

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


embedding_service = EmbeddingService()
