from config import config


class PineconeClient:
    def __init__(self):
        self._pc = None
        self._index = None

    def _ensure_connected(self) -> bool:
        if self._index is not None:
            return True
        if not config.PINECONE_API_KEY or config.PINECONE_API_KEY == "your_pinecone_api_key_here":
            return False
        try:
            from pinecone import Pinecone
            self._pc = Pinecone(api_key=config.PINECONE_API_KEY)
            self._index = self._pc.Index(config.PINECONE_INDEX)
            return True
        except Exception:
            return False

    def query(self, vector: list[float], top_k: int = None, language: str = "az") -> list:
        if not self._ensure_connected():
            return []
        top_k = top_k or config.RAG_TOP_K
        try:
            result = self._index.query(
                vector=vector,
                top_k=top_k,
                include_metadata=True,
                filter={"language": language, "is_active": True},
            )
            return result.matches
        except Exception:
            return []

    def upsert(self, vectors: list[dict]) -> None:
        if self._ensure_connected():
            self._index.upsert(vectors=vectors)

    def delete(self, ids: list[str]) -> None:
        if self._ensure_connected():
            self._index.delete(ids=ids)


pinecone_client = PineconeClient()
