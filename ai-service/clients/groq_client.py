from __future__ import annotations

import json
import logging
import random
import time
from typing import Any, Iterator

import requests

from config import GroqConfig
from .groq_errors import (
    GroqAuthError,
    GroqBadResponseError,
    GroqError,
    GroqRateLimitError,
    GroqServerError,
    GroqTimeoutError,
)

log = logging.getLogger(__name__)

_RETRYABLE = (GroqRateLimitError, GroqServerError, GroqTimeoutError)


class GroqClient:
    def __init__(self, cfg: GroqConfig, session: requests.Session | None = None) -> None:
        self._cfg = cfg
        self._session = session or requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        })

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        response_format: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        body = self._body(messages, model, temperature, max_tokens, response_format, stream=False)
        return self._call_with_retry(body)

    def chat_stream(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> Iterator[str]:
        body = self._body(messages, model, temperature, max_tokens, None, stream=True)
        url = f"{self._cfg.base_url}/chat/completions"
        try:
            resp = self._session.post(url, json=body, timeout=self._cfg.timeout_s, stream=True)
        except requests.Timeout as exc:
            raise GroqTimeoutError(str(exc)) from exc
        except requests.RequestException as exc:
            raise GroqError(str(exc)) from exc
        if resp.status_code >= 400:
            self._raise_for_status(resp)

        for raw in resp.iter_lines(decode_unicode=True):
            if not raw or not raw.startswith("data:"):
                continue
            payload = raw[5:].strip()
            if payload == "[DONE]":
                return
            try:
                obj = json.loads(payload)
            except json.JSONDecodeError:
                continue
            choices = obj.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta") or {}
            piece = delta.get("content")
            if piece:
                yield piece

    def _body(
        self,
        messages: list[dict[str, str]],
        model: str | None,
        temperature: float,
        max_tokens: int,
        response_format: dict[str, str] | None,
        stream: bool,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": model or self._cfg.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        if response_format:
            body["response_format"] = response_format
        return body

    def _call_with_retry(self, body: dict[str, Any]) -> dict[str, Any]:
        last: Exception | None = None
        for attempt in range(self._cfg.max_retries + 1):
            try:
                return self._post(body)
            except _RETRYABLE as exc:
                last = exc
                if attempt == self._cfg.max_retries:
                    break
                delay = min(2 ** attempt, 8) + random.uniform(0, 0.5)
                log.warning("groq retry %s after %s: %s", attempt + 1, type(exc).__name__, exc)
                time.sleep(delay)
        assert last is not None
        raise last

    def _post(self, body: dict[str, Any]) -> dict[str, Any]:
        url = f"{self._cfg.base_url}/chat/completions"
        try:
            resp = self._session.post(url, json=body, timeout=self._cfg.timeout_s)
        except requests.Timeout as exc:
            raise GroqTimeoutError(str(exc)) from exc
        except requests.RequestException as exc:
            raise GroqError(str(exc)) from exc
        return self._parse(resp)

    def _parse(self, resp: requests.Response) -> dict[str, Any]:
        if resp.status_code >= 400:
            self._raise_for_status(resp)
        try:
            data = resp.json()
        except ValueError as exc:
            raise GroqBadResponseError("invalid json") from exc
        if "choices" not in data or not data["choices"]:
            raise GroqBadResponseError("missing choices")
        return data

    @staticmethod
    def _raise_for_status(resp: requests.Response) -> None:
        code = resp.status_code
        msg = _safe_msg(resp)
        if code in (401, 403):
            raise GroqAuthError(msg)
        if code == 429:
            raise GroqRateLimitError(msg)
        if 500 <= code < 600:
            raise GroqServerError(msg)
        raise GroqError(f"http {code}: {msg}")

    def close(self) -> None:
        self._session.close()


def _safe_msg(resp: requests.Response) -> str:
    try:
        return resp.json().get("error", {}).get("message", resp.text)[:500]
    except ValueError:
        return resp.text[:500]
