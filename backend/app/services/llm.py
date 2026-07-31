"""
LLM Client — Ollama Integration Layer
Wraps Ollama API for streaming and non-streaming responses.
Falls back to llama3.2 if qwen2.5:3b is unavailable.
"""
import httpx
import json
import asyncio
import logging
from typing import AsyncGenerator, Optional

logger = logging.getLogger(__name__)

OLLAMA_BASE = "http://localhost:11434"
PRIMARY_MODEL = "qwen2.5:3b"
FALLBACK_MODEL = "llama3.2:latest"


async def get_available_model() -> str:
    """Returns the best available model."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if PRIMARY_MODEL in models:
                    return PRIMARY_MODEL
                if FALLBACK_MODEL in models:
                    return FALLBACK_MODEL
                if models:
                    return models[0]
    except Exception as e:
        logger.warning(f"Could not query Ollama models: {e}")
    return PRIMARY_MODEL  # try anyway


async def generate_response(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    temperature: float = 0.1,
    max_tokens: int = 1024,
) -> str:
    """
    Generate a complete LLM response (non-streaming).
    Returns the full text or an error message.
    """
    if model is None:
        model = await get_available_model()

    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "").strip()
            else:
                logger.error(f"Ollama error {resp.status_code}: {resp.text}")
                return _llm_unavailable_response()
    except httpx.ConnectError:
        logger.warning("Ollama not running — returning fallback response.")
        return _llm_unavailable_response()
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        return _llm_unavailable_response()


async def generate_streaming(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
    temperature: float = 0.1,
) -> AsyncGenerator[str, None]:
    """
    Generate a streaming LLM response, yielding tokens one by one.
    """
    if model is None:
        model = await get_available_model()

    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": True,
        "options": {
            "temperature": temperature,
            "num_predict": 1024,
            "top_p": 0.9,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{OLLAMA_BASE}/api/generate", json=payload) as resp:
                async for line in resp.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("response", "")
                            if token:
                                yield token
                            if chunk.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
    except httpx.ConnectError:
        yield _llm_unavailable_response()
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"\n[Error: {str(e)}]"


def _llm_unavailable_response() -> str:
    return (
        "⚠️ AI Copilot is temporarily unavailable. "
        "Please ensure Ollama is running (`ollama serve`) and the model is pulled. "
        "All booking and fleet operations remain fully functional."
    )
