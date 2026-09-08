"""Thin hosted-model swap layer. Not an LLM framework.

One factory reads overlay env vars and constructs the active provider.
Swap vendors by changing config, not call sites.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

DEFAULT_FAST_MODEL = "gemini-3.5-flash-lite"
DEFAULT_EMBED_MODEL = "gemini-embedding-001"
DEFAULT_WRITE_MODEL = "claude-haiku-4-5"
DEFAULT_FAST_PROVIDER = "gemini"
DEFAULT_WRITE_PROVIDER = "anthropic"

_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
_TIMEOUT = 30.0


@dataclass
class ChatMessage:
    role: str
    content: str
    cache_breakpoint: bool = False


@dataclass
class ToolSpec:
    name: str
    description: str = ""
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass
class ChatResult:
    content: str
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    model: str = ""
    provider: str = ""
    error: str | None = None


class LLMProvider(Protocol):
    def chat(
        self, messages: list[ChatMessage], tools: list[ToolSpec] | None = None
    ) -> ChatResult: ...

    def embed(self, text: str) -> list[float] | None: ...


def _joined_system(messages: list[ChatMessage]) -> str:
    parts = [m.content.strip() for m in messages if m.role == "system" and m.content.strip()]
    return "\n\n".join(parts)


def _dialogue(messages: list[ChatMessage]) -> list[ChatMessage]:
    return [m for m in messages if m.role != "system" and m.content.strip()]


class GeminiProvider:
    name = "gemini"

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        embed_model: str = DEFAULT_EMBED_MODEL,
    ) -> None:
        self.api_key = api_key.strip()
        self.model = model or DEFAULT_FAST_MODEL
        self.embed_model = embed_model or DEFAULT_EMBED_MODEL

    def chat(
        self, messages: list[ChatMessage], tools: list[ToolSpec] | None = None
    ) -> ChatResult:
        if not self.api_key:
            return ChatResult(
                content="",
                model=self.model,
                provider=self.name,
                error="missing_api_key",
            )
        body: dict[str, Any] = {"contents": _gemini_contents(_dialogue(messages))}
        system = _joined_system(messages)
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        if tools:
            body["tools"] = [{"functionDeclarations": [_gemini_tool(t) for t in tools]}]
        url = f"{_GEMINI_BASE}/models/{self.model}:generateContent"
        try:
            data = _post_json(url, body, params={"key": self.api_key})
        except (httpx.HTTPError, OSError, ValueError):
            return ChatResult(
                content="",
                model=self.model,
                provider=self.name,
                error="unreachable",
            )
        return _gemini_chat_result(data, model=self.model)

    def embed(self, text: str) -> list[float] | None:
        if not self.api_key or not text.strip():
            return None
        url = f"{_GEMINI_BASE}/models/{self.embed_model}:embedContent"
        body = {"content": {"parts": [{"text": text}]}}
        try:
            data = _post_json(url, body, params={"key": self.api_key})
        except (httpx.HTTPError, OSError, ValueError):
            return None
        values = (data.get("embedding") or {}).get("values")
        if not isinstance(values, list) or not values:
            return None
        try:
            return [float(x) for x in values]
        except (TypeError, ValueError):
            return None


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, *, api_key: str, model: str) -> None:
        self.api_key = api_key.strip()
        self.model = model or DEFAULT_WRITE_MODEL

    def chat(
        self, messages: list[ChatMessage], tools: list[ToolSpec] | None = None
    ) -> ChatResult:
        if not self.api_key:
            return ChatResult(
                content="",
                model=self.model,
                provider=self.name,
                error="missing_api_key",
            )
        try:
            import anthropic
        except ImportError:
            return ChatResult(
                content="",
                model=self.model,
                provider=self.name,
                error="unreachable",
            )
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 1024,
            "messages": [
                {"role": "assistant" if m.role == "assistant" else "user", "content": m.content}
                for m in _dialogue(messages)
            ]
            or [{"role": "user", "content": ""}],
        }
        system = _anthropic_system(messages)
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = [_anthropic_tool(t) for t in tools]
        try:
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(**kwargs)
        except Exception:  # noqa: BLE001 — missing/unreachable API must not crash callers
            return ChatResult(
                content="",
                model=self.model,
                provider=self.name,
                error="unreachable",
            )
        return _anthropic_chat_result(response, model=self.model)

    def embed(self, text: str) -> list[float] | None:
        return None


def get_provider(tier: str = "fast") -> LLMProvider:
    """Construct the configured provider for a skill tier. Only factory of clients."""
    normalized = (tier or "fast").strip().lower()
    if normalized == "reliable":
        name = os.environ.get("PRODUCTNAME_LLM_WRITE_PROVIDER", DEFAULT_WRITE_PROVIDER)
        key = os.environ.get("PRODUCTNAME_LLM_WRITE_API_KEY") or os.environ.get(
            "PRODUCTNAME_LLM_API_KEY", ""
        )
        model = os.environ.get("PRODUCTNAME_LLM_WRITE_MODEL", DEFAULT_WRITE_MODEL)
    elif normalized == "fast":
        name = os.environ.get("PRODUCTNAME_LLM_PROVIDER", DEFAULT_FAST_PROVIDER)
        key = os.environ.get("PRODUCTNAME_LLM_API_KEY", "")
        model = os.environ.get("PRODUCTNAME_LLM_MODEL", DEFAULT_FAST_MODEL)
    else:
        raise ValueError(f"unknown model tier {tier!r}")

    vendor = (name or "").strip().lower()
    if vendor in ("gemini", "google"):
        return GeminiProvider(
            api_key=key or "",
            model=model or DEFAULT_FAST_MODEL,
            embed_model=os.environ.get("PRODUCTNAME_LLM_EMBED_MODEL", DEFAULT_EMBED_MODEL),
        )
    if vendor in ("anthropic", "claude"):
        return AnthropicProvider(api_key=key or "", model=model or DEFAULT_WRITE_MODEL)
    raise ValueError(f"unknown LLM provider {vendor!r}")


def provider_for_skill(skill: Any) -> LLMProvider:
    """Resolve the provider once per skill call. Do not re-resolve mid-turn."""
    tier = "reliable" if getattr(skill, "is_write_skill", False) else getattr(
        skill, "model_tier", "fast"
    )
    if tier not in ("fast", "reliable"):
        tier = "fast"
    return get_provider(tier)


def _post_json(url: str, body: dict[str, Any], *, params: dict[str, str]) -> dict[str, Any]:
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(url, params=params, json=body)
        response.raise_for_status()
        data = response.json()
    if not isinstance(data, dict):
        raise ValueError("provider response was not an object")
    return data


def _gemini_contents(messages: list[ChatMessage]) -> list[dict[str, Any]]:
    contents = []
    for message in messages:
        role = "model" if message.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": message.content}]})
    return contents or [{"role": "user", "parts": [{"text": ""}]}]


def _gemini_tool(tool: ToolSpec) -> dict[str, Any]:
    parameters = tool.parameters or {"type": "object", "properties": {}}
    return {
        "name": tool.name,
        "description": tool.description,
        "parameters": parameters,
    }


def _gemini_chat_result(data: dict[str, Any], *, model: str) -> ChatResult:
    candidates = data.get("candidates") or []
    parts = []
    if candidates and isinstance(candidates[0], dict):
        content = candidates[0].get("content") or {}
        raw_parts = content.get("parts") or []
        if isinstance(raw_parts, list):
            parts = raw_parts
    texts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    for part in parts:
        if not isinstance(part, dict):
            continue
        if part.get("text"):
            texts.append(str(part["text"]))
        call = part.get("functionCall")
        if isinstance(call, dict) and call.get("name"):
            args = call.get("args") if isinstance(call.get("args"), dict) else {}
            tool_calls.append({"name": str(call["name"]), "arguments": args})
    return ChatResult(
        content="".join(texts),
        tool_calls=tool_calls,
        model=model,
        provider="gemini",
    )


def _anthropic_system(messages: list[ChatMessage]) -> str | list[dict[str, Any]] | None:
    """Stable prefix breakpoint: cache_control on the last marked system block.

    Anthropic caches tools, then system, then messages up to that block.
    Unmarked system text stays a single string so non-assembled calls are unchanged.
    """
    blocks: list[dict[str, Any]] = []
    marked = False
    for message in messages:
        if message.role != "system" or not message.content.strip():
            continue
        block: dict[str, Any] = {"type": "text", "text": message.content}
        if message.cache_breakpoint:
            block["cache_control"] = {"type": "ephemeral"}
            marked = True
        blocks.append(block)
    if not blocks:
        return None
    if not marked:
        return _joined_system(messages)
    return blocks


def _anthropic_tool(tool: ToolSpec) -> dict[str, Any]:
    schema = tool.parameters or {"type": "object", "properties": {}}
    return {
        "name": tool.name,
        "description": tool.description,
        "input_schema": schema,
    }


def _anthropic_chat_result(response: Any, *, model: str) -> ChatResult:
    texts: list[str] = []
    tool_calls: list[dict[str, Any]] = []
    for block in getattr(response, "content", None) or []:
        kind = getattr(block, "type", None)
        if kind == "text":
            texts.append(str(getattr(block, "text", "") or ""))
        elif kind == "tool_use":
            raw_input = getattr(block, "input", None)
            arguments = raw_input if isinstance(raw_input, dict) else {}
            tool_calls.append(
                {"name": str(getattr(block, "name", "")), "arguments": arguments}
            )
    return ChatResult(
        content="".join(texts),
        tool_calls=tool_calls,
        model=model,
        provider="anthropic",
    )
