from __future__ import annotations

from schemas.categorise import CategoriseRequest, CategoriseResult
from schemas.report import ReportRequest, ReportResult

_KEYWORD_RULES = [
    (("sql", "query", "concat", "drop table"), "INJECTION", "HIGH"),
    (("xss", "script", "innerhtml"), "XSS", "MEDIUM"),
    (("jwt", "token", "auth", "password"), "BROKEN_AUTH", "HIGH"),
    (("admin", "role", "privilege", "rbac"), "BROKEN_ACCESS", "HIGH"),
    (("config", "default", "secret", "env"), "MISCONFIG", "MEDIUM"),
    (("ssrf", "internal url", "metadata"), "SSRF", "HIGH"),
    (("xml", "xxe", "entity"), "XXE", "MEDIUM"),
    (("deserial", "pickle", "unmarshal"), "INSECURE_DESERIALIZATION", "HIGH"),
    (("dependency", "cve", "outdated", "vulnerable lib"), "VULNERABLE_COMPONENT", "MEDIUM"),
    (("log", "audit", "monitor"), "INSUFFICIENT_LOGGING", "LOW"),
    (("pii", "ssn", "credit card", "leak"), "SENSITIVE_DATA", "HIGH"),
]


def categorise_fallback(req: CategoriseRequest) -> CategoriseResult:
    text = f"{req.title} {req.description}".lower()
    for keywords, cat, sev in _KEYWORD_RULES:
        if any(k in text for k in keywords):
            return CategoriseResult(
                category=cat,
                severity=sev,
                confidence=0.4,
                rationale="keyword-based fallback (model unavailable)",
                tags=["fallback"],
            )
    return CategoriseResult(
        category="OTHER",
        severity="MEDIUM",
        confidence=0.2,
        rationale="no keyword match (model unavailable)",
        tags=["fallback"],
    )


def report_fallback(req: ReportRequest) -> ReportResult:
    sev_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    risks = sorted(req.risks, key=lambda r: sev_order.get(r.severity, 4))
    lines = ["## Overview", "AI service unavailable; this report is a deterministic fallback.", "", "## Risks"]
    for r in risks:
        lines.append(f"### {r.title}")
        lines.append(f"- Severity: {r.severity}")
        lines.append(f"- Category: {r.category}")
        lines.append(f"- Description: {r.description}")
        lines.append("")
    lines.append("## Recommended Actions")
    lines.append("- Triage CRITICAL/HIGH first; assign owners; rerun once AI is available for tailored guidance.")
    return ReportResult(
        content="\n".join(lines),
        audience=req.audience,
        format=req.format,
        risk_count=len(req.risks),
        metadata={"fallback": True},
    )


def recommend_fallback(text: str) -> list[dict[str, str]]:
    text_lower = text.lower()
    recs: list[dict[str, str]] = []

    if any(k in text_lower for k in ("sql", "query", "injection", "concat", "database")):
        recs.append({
            "priority": "High",
            "title": "Use Parameterized Queries and Prepared Statements",
            "description": "Ensure all database queries use parameterized interfaces or ORM methods instead of string concatenation."
        })
        recs.append({
            "priority": "Medium",
            "title": "Apply Database Principle of Least Privilege",
            "description": "Restrict database account permissions to prevent schema tampering and unauthorized table access."
        })

    if any(k in text_lower for k in ("auth", "jwt", "token", "password", "session", "credential")):
        recs.append({
            "priority": "High",
            "title": "Harden Authentication and Token Validation",
            "description": "Enforce strong password hashing (Argon2/bcrypt), validate JWT signatures and expiration, and implement account lockout."
        })
        recs.append({
            "priority": "Medium",
            "title": "Enforce Multi-Factor Authentication",
            "description": "Require MFA for administrative accounts and sensitive operations."
        })

    if any(k in text_lower for k in ("xss", "script", "html", "dom", "innerhtml")):
        recs.append({
            "priority": "High",
            "title": "Implement Context-Aware Output Encoding",
            "description": "Encode all user-supplied data before inserting it into the DOM or HTML responses."
        })
        recs.append({
            "priority": "Medium",
            "title": "Deploy Strict Content Security Policy (CSP)",
            "description": "Configure HTTP CSP headers to disallow inline scripts and restrict script sources to trusted origins."
        })

    if any(k in text_lower for k in ("dependency", "cve", "outdated", "package", "library", "component")):
        recs.append({
            "priority": "High",
            "title": "Upgrade Vulnerable Dependencies",
            "description": "Update vulnerable third-party libraries to their latest patched releases."
        })
        recs.append({
            "priority": "Medium",
            "title": "Integrate Automated Software Composition Analysis (SCA)",
            "description": "Set up CI/CD pipeline scans using automated dependency vulnerability scanners."
        })

    if not recs:
        recs = [
            {
                "priority": "High",
                "title": "Conduct Immediate Code and Configuration Audit",
                "description": "Review the affected component's source code and deployment configuration to identify exploitable vectors."
            },
            {
                "priority": "Medium",
                "title": "Enforce Principle of Least Privilege",
                "description": "Restrict access rights and runtime privileges to only those strictly required for normal operation."
            },
            {
                "priority": "Low",
                "title": "Enable Comprehensive Audit Logging and Monitoring",
                "description": "Log all security events and configure alerting for anomalous patterns or policy violations."
            }
        ]
    return recs


def describe_fallback(text: str) -> dict[str, str]:
    text_lower = text.lower()
    risk_level = "Medium"
    for keywords, _, sev in _KEYWORD_RULES:
        if any(k in text_lower for k in keywords):
            risk_level = sev.capitalize()
            break
    return {
        "risk_level": risk_level,
        "reasoning": "Heuristic fallback analysis (AI model temporarily unavailable).",
        "affected_component": "Identified from risk description."
    }


def query_fallback(question: str) -> str:
    return (
        "The AI knowledge service is temporarily using a fallback mode. "
        "For application security, always follow OWASP guidelines: "
        "validate and sanitize all inputs, use parameterized queries, enforce strict authentication/authorization, "
        "and keep all dependencies updated."
    )


def analyse_document_fallback(text: str) -> dict:
    findings = []
    text_lower = text.lower()
    for keywords, cat, sev in _KEYWORD_RULES:
        if any(k in text_lower for k in keywords):
            findings.append({
                "title": f"Potential {cat.replace('_', ' ').title()} Issue",
                "severity": sev.capitalize(),
                "description": f"Heuristic scan identified patterns related to {cat.lower()}.",
                "recommendation": "Review relevant code sections and implement defensive controls."
            })
    if not findings:
        summary = "Heuristic fallback scan complete. No immediate critical keyword indicators detected."
    else:
        summary = f"Heuristic fallback scan detected {len(findings)} potential security findings."
    return {
        "findings": findings,
        "summary": summary
    }
