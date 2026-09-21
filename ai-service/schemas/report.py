from __future__ import annotations

from dataclasses import dataclass, field

REPORT_FORMATS = {"markdown", "summary"}
REPORT_AUDIENCES = {"engineer", "manager", "executive"}


@dataclass
class RiskItem:
    title: str
    description: str
    category: str = "OTHER"
    severity: str = "MEDIUM"

    @classmethod
    def from_json(cls, data: dict) -> "RiskItem":
        if not isinstance(data, dict):
            raise ValueError("risk item must be object")
        title = str(data.get("title", "")).strip()
        description = str(data.get("description", "")).strip()
        if not title and not description:
            title = "Risk Assessment Item"
            description = "Detailed risk assessment and vulnerability mitigation analysis."
        elif not title:
            title = description[:60]
        elif not description:
            description = f"Risk evaluation and mitigation review for: {title}"
        return cls(
            title=title[:300],
            description=description[:8000],
            category=str(data.get("category", "OTHER")).upper() or "OTHER",
            severity=str(data.get("severity", "MEDIUM")).upper() or "MEDIUM",
        )


@dataclass
class ReportRequest:
    risks: list[RiskItem]
    audience: str = "engineer"
    format: str = "markdown"
    project_name: str = ""

    @classmethod
    def from_json(cls, data: dict) -> "ReportRequest":
        if not isinstance(data, dict):
            raise ValueError("body must be object")
        raw_risks = data.get("risks")
        if not isinstance(raw_risks, list) or not raw_risks:
            if "title" in data or "description" in data or "category" in data:
                raw_risks = [data]
            else:
                raw_risks = [{
                    "title": data.get("project_name") or "Portfolio Risk Assessment",
                    "description": "Comprehensive evaluation of platform vulnerabilities, operational threats, and system posture.",
                    "category": "OPERATIONAL",
                    "severity": "MEDIUM",
                }]
        if len(raw_risks) > 100:
            raise ValueError("at most 100 risks per report")
        risks = [RiskItem.from_json(r) for r in raw_risks]
        audience = str(data.get("audience", "engineer")).lower()
        if audience not in REPORT_AUDIENCES:
            audience = "engineer"
        fmt = str(data.get("format", "markdown")).lower()
        if fmt not in REPORT_FORMATS:
            fmt = "markdown"
        return cls(
            risks=risks,
            audience=audience,
            format=fmt,
            project_name=str(data.get("project_name", "")).strip()[:120],
        )


@dataclass
class ReportResult:
    content: str
    audience: str
    format: str
    risk_count: int
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "audience": self.audience,
            "format": self.format,
            "risk_count": self.risk_count,
            "metadata": self.metadata,
        }
