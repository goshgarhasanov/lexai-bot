import json
from config import config

try:
    import redis
    _redis_client = redis.from_url(config.REDIS_URL, decode_responses=True)
    _redis_client.ping()
    _USE_REDIS = True
except Exception:
    _USE_REDIS = False
    _in_memory: dict[str, list] = {}


def _key(user_id: int) -> str:
    return f"lexai:history:{user_id}"


def get_history(user_id: int) -> list[dict]:
    if _USE_REDIS:
        raw = _redis_client.get(_key(user_id))
        return json.loads(raw) if raw else []
    return _in_memory.get(str(user_id), [])


def append_message(user_id: int, role: str, content: str) -> None:
    history = get_history(user_id)
    history.append({"role": role, "content": content})
    history = history[-(config.MEMORY_WINDOW * 2):]

    if _USE_REDIS:
        _redis_client.set(_key(user_id), json.dumps(history), ex=86400 * 7)
    else:
        _in_memory[str(user_id)] = history


def clear_history(user_id: int) -> None:
    if _USE_REDIS:
        _redis_client.delete(_key(user_id))
    else:
        _in_memory.pop(str(user_id), None)
