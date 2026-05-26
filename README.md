<div align="center">

# ⚖️ LexAI — Azerbaijani Legal AI Assistant (Telegram Bot)

**An AI legal assistant for Azerbaijani law, delivered as a Telegram bot — answers grounded in legislation via retrieval-augmented generation (RAG).**

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![Telegram](https://img.shields.io/badge/python--telegram--bot-21-26A5E4?logo=telegram&logoColor=white)
![Pinecone](https://img.shields.io/badge/RAG-Pinecone-4c6ef5)

</div>

---

## Overview

**LexAI** is a Telegram bot that answers legal questions in Azerbaijani. Instead of free-form hallucination, it grounds answers in actual legislation using **RAG** over a Pinecone vector index of laws — combining strong LLMs with retrieved legal context, plus conversation memory, voice input and subscription billing.

> ⚠️ LexAI provides general legal information, **not** professional legal advice. For binding matters, consult a licensed lawyer.

## Features

- 💬 **Legal Q&A in Azerbaijani** grounded in legislation (RAG)
- 📚 **Pinecone** vector search over a law corpus (`lexai-laws` index)
- 🧠 Multi-provider LLMs (Anthropic / OpenAI / Google / Perplexity) with graceful fallback
- 🗂️ Per-user **conversation memory**
- 🎙️ **Voice message** support (speech → answer)
- 💳 Subscription plans & in-bot payments (Telegram payments)
- 📄 Built-in Terms, Privacy, Refund & Rules flows
- 🌐 Multi-language UI

## Architecture

```
lexai-bot/
├── main.py            # bot entry point (python-telegram-bot)
├── config.py          # env-driven configuration
├── handlers/          # commands, messages, callbacks, voice, payments
├── services/          # ai_service, memory_service, voice_service
├── rag/               # embeddings + Pinecone client + retrieval
├── prompts/           # system prompts (identity, safety, RAG, memory…)
├── legal/             # terms & legal copy
├── database/          # SQLAlchemy models
└── tests/
```

## Tech Stack

`python-telegram-bot` · Anthropic / OpenAI / Google Generative AI / Perplexity · **Pinecone** (RAG) · **SQLAlchemy** · **Redis** · python-dotenv.

## Getting Started

```bash
git clone https://github.com/goshgarhasanov/lexai-bot.git
cd lexai-bot
pip install -r requirements.txt
cp .env.example .env     # set BOT token, LLM keys, PINECONE_*, DATABASE_URL, REDIS_*
python main.py
```

## License

© Goshgar Hasanzadeh. All rights reserved.
