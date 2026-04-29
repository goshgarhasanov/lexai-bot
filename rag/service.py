from rag.embeddings import embedding_service
from rag.pinecone_client import pinecone_client
from prompts.rag_template import format_rag_entry, NO_RAG_FALLBACK
from config import config


class RAGService:
    def build_context(self, query: str, language: str = "az") -> str:
        vector = embedding_service.embed(query)
        if not vector:
            return NO_RAG_FALLBACK

        matches = pinecone_client.query(vector=vector, language=language)
        if not matches:
            return NO_RAG_FALLBACK

        parts = []
        for match in matches:
            if match.score >= config.RAG_SIMILARITY_THRESHOLD:
                parts.append(format_rag_entry(match))

        return "\n\n".join(parts) if parts else NO_RAG_FALLBACK


rag_service = RAGService()
