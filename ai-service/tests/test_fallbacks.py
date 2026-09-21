from schemas.categorise import CategoriseRequest
from schemas.report import ReportRequest, RiskItem
from services.fallbacks import categorise_fallback, report_fallback


def test_keyword_injection_match():
    req = CategoriseRequest(title="SQL query concat", description="user input added to sql query")
    result = categorise_fallback(req)
    assert result.category == "INJECTION"
    assert "fallback" in result.tags


def test_no_match_returns_other():
    req = CategoriseRequest(title="unrelated topic", description="nothing security related here at all")
    result = categorise_fallback(req)
    assert result.category == "OTHER"
    assert result.confidence < 0.5


def test_report_fallback_orders_by_severity():
    req = ReportRequest(
        risks=[
            RiskItem(title="Low risk", description="minor", severity="LOW"),
            RiskItem(title="Critical risk", description="severe", severity="CRITICAL"),
            RiskItem(title="High risk", description="bad", severity="HIGH"),
        ],
        audience="engineer",
        format="markdown",
    )
    result = report_fallback(req)
    critical_pos = result.content.index("Critical risk")
    high_pos = result.content.index("High risk")
    low_pos = result.content.index("Low risk")
    assert critical_pos < high_pos < low_pos


def test_recommend_fallback_keywords():
    from services.fallbacks import recommend_fallback
    recs = recommend_fallback("Found SQL injection in login query")
    assert len(recs) >= 1
    assert any("Parameterized" in r["title"] for r in recs)


def test_describe_fallback():
    from services.fallbacks import describe_fallback
    desc = describe_fallback("Cross site scripting xss in comments")
    assert desc["risk_level"] in ("Low", "Medium", "High")
    assert "reasoning" in desc


def test_query_fallback():
    from services.fallbacks import query_fallback
    ans = query_fallback("How to fix security issue")
    assert "OWASP" in ans
