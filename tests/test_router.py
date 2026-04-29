import pytest
from unittest.mock import patch, MagicMock
from router.classifier import QueryRouter


@pytest.fixture
def router():
    return QueryRouter()


def test_fallback_simple_definition(router):
    result = router._fallback_classify("Kirayə müqaviləsi nədir?")
    assert result["category"] == "simple_definition"


def test_fallback_document_drafting(router):
    result = router._fallback_classify("Mənə kirayə müqaviləsi hazırla")
    assert result["category"] == "document_drafting"


def test_fallback_crisis_urgency(router):
    result = router._fallback_classify("Məni həbs etdilər, nə edim?")
    assert result["urgency"] == "high"
    assert result["category"] == "sentiment_crisis"


def test_fallback_deep_analysis(router):
    result = router._fallback_classify("Torpaq mübahisəsini necə həll edə bilərəm?")
    assert result["category"] == "deep_legal_analysis"
