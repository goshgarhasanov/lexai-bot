from prompts.safety import get_applicable_disclaimers


def test_criminal_disclaimer():
    disclaimers = get_applicable_disclaimers("Məni həbs etdilər")
    assert any("Cinayət" in d for d in disclaimers)


def test_violence_disclaimer():
    disclaimers = get_applicable_disclaimers("Ər döyür, qorxuram")
    assert any("102" in d for d in disclaimers)


def test_property_disclaimer():
    disclaimers = get_applicable_disclaimers("Ev almaq istəyirəm, ipoteka götürəcəm")
    assert any("10,000" in d for d in disclaimers)


def test_no_disclaimer_for_safe_query():
    disclaimers = get_applicable_disclaimers("Kirayə müqaviləsi nədir?")
    assert len(disclaimers) == 0
