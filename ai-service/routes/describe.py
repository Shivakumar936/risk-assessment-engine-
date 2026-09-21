from __future__ import annotations

import json
import logging

from flask import Blueprint, current_app, jsonify, request

from clients import GroqClient
from clients.groq_errors import GroqError
from middleware.rate_limit import TokenBucket, rate_limit
from services.fallbacks import describe_fallback

log = logging.getLogger(__name__)

describe_bp = Blueprint("describe", __name__)
_bucket = TokenBucket(max_per_window=20, window_s=60)


@describe_bp.post("/describe")
@rate_limit(_bucket)
def describe():
    body = request.get_json(silent=True) or {}
    if "input" in body and isinstance(body["input"], dict):
        text = body["input"].get("text", "")
    else:
        text = body.get("text", "")

    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "text is required"}), 400

    groq: GroqClient = current_app.extensions["groq"]
    messages = [
        {
            "role": "system",
            "content": (
                "You are a security analyst. Classify the described risk as Low, Medium, or High. "
                "Identify the affected component and provide a brief reasoning.\n\n"
                "Respond with JSON matching this schema exactly:\n"
                '{"risk_level": "Low|Medium|High", "reasoning": "...", "affected_component": "..."}\n'
                "No code fences, no prose outside JSON."
            ),
        },
        {"role": "user", "content": text.strip()},
    ]
    try:
        resp = groq.chat(
            messages,
            temperature=0.1,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"]["content"]
        data = json.loads(content)
        return jsonify({
            "risk_level": str(data.get("risk_level", "Unknown")),
            "reasoning": str(data.get("reasoning", "")),
            "affected_component": str(data.get("affected_component", "")),
        }), 200
    except GroqError as exc:
        log.warning("describe groq error, using fallback: %s", exc)
        return jsonify({**describe_fallback(text.strip()), "degraded": True}), 200
    except (json.JSONDecodeError, KeyError) as exc:
        log.warning("describe parsing error, using fallback: %s", exc)
        return jsonify({**describe_fallback(text.strip()), "degraded": True}), 200
