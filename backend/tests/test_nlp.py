import pytest

from app.core.categories import is_valid_category
from app.modules.nlp.amount_parser import parse_amount_and_description
from app.modules.nlp.service import parse_transaction_text


def _auth_headers(client) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "NLP Tester", "email": "nlp@example.com", "password": "Password123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


@pytest.mark.parametrize(
    ("raw_text", "expected_amount"),
    [
        ("makan siang 15rb", 15_000),
        ("parkir motor 15 rb", 15_000),
        ("beli pulsa 15ribu", 15_000),
        ("warteg 15 ribu", 15_000),
        ("ngopi susu 20k", 20_000),
        ("boba 20K", 20_000),
        ("kopi kenangan 22.5k", 22_500),
        ("ayam bakar 22,5rb", 22_500),
        ("uang saku 1jt", 1_000_000),
        ("beasiswa cair 1,5jt", 1_500_000),
        ("kiriman ortu 2.5 juta", 2_500_000),
        ("gaji freelance 1,25 juta", 1_250_000),
        ("nasi padang Rp 25.000", 25_000),
        ("fotokopi modul Rp25000", 25_000),
        ("es teh rp 12.500", 12_500),
        ("isi bensin 50.000", 50_000),
        ("belanja bulanan 150000", 150_000),
        ("gorengan 5000", 5_000),
        ("parkir goceng", 5_000),
        ("jajan cilok ceban", 10_000),
        ("makan bakso noban", 20_000),
        ("isi kuota goban", 50_000),
        ("dikasih tante cepek", 100_000),
    ],
)
def test_amount_parser_indonesia_formats(raw_text: str, expected_amount: int):
    parsed = parse_amount_and_description(raw_text)
    assert parsed.amount == expected_amount
    assert len(parsed.clean_description) > 0


def test_amount_parser_quantity_vs_nominal_and_missing_amount_edge_cases():
    case1 = parse_amount_and_description("beli 2 kopi 30rb")
    assert case1.amount == 30_000
    assert case1.clean_description == "Beli 2 kopi"

    case2 = parse_amount_and_description("bayar kos bulan 3 850.000")
    assert case2.amount == 850_000
    assert case2.clean_description == "Bayar kos bulan 3"

    case3 = parse_amount_and_description("makan bertiga 75k")
    assert case3.amount == 75_000
    assert case3.clean_description == "Makan bertiga"

    case4 = parse_amount_and_description("beli 2 kopi @15rb total 30rb")
    assert case4.amount == 30_000

    no_amount_1 = parse_amount_and_description("halo bot")
    assert no_amount_1.amount is None
    assert no_amount_1.clean_description == "Halo bot"

    no_amount_2 = parse_amount_and_description("lupa harganya")
    assert no_amount_2.amount is None

    non_money_cepek = parse_amount_and_description("dapet nilai cepek ujian kalkulus")
    assert non_money_cepek.amount is None


def test_nlp_classification_and_fallback_respect_category_contract():
    samples = [
        ("tadi makan ayam geprek kantin 22rb", "expense", "Kebutuhan Primer", 22_000),
        ("ngopi susu gula aren di kafe 25k", "expense", "Gaya Hidup", 25_000),
        ("fotokopi modul praktikum dan jilid 45rb", "expense", "Pendidikan", 45_000),
        ("isi bensin pertalite motor 35rb", "expense", "Transportasi", 35_000),
        ("beli obat flu paracetamol di apotek 18rb", "expense", "Kesehatan", 18_000),
        ("bayar kosan bulanan ibu kos 850.000", "expense", "Tagihan", 850_000),
        ("kiriman uang saku bulanan dari ortu 2jt", "income", "Uang Saku", 2_000_000),
        ("honor asisten praktikum laboratorium cair 500k", "income", "Gaji/Part-time", 500_000),
        ("pencairan dana beasiswa kip kuliah 1,5jt", "income", "Beasiswa", 1_500_000),
        ("pindahin saldo rekening utama ke dompet gopay 200rb", "transfer", "Lainnya", 200_000),
    ]

    for text, expected_type, expected_category, expected_amount in samples:
        result = parse_transaction_text(text)
        assert is_valid_category(result.type, result.category)
        assert result.amount == expected_amount
        assert result.type == expected_type
        assert result.category == expected_category
        assert 0.0 <= result.confidence <= 1.0
        assert result.needs_confirmation is False

    # Missing amount triggers needs_confirmation = True
    missing = parse_transaction_text("makan siang nasi padang")
    assert missing.amount is None
    assert missing.needs_confirmation is True
    assert is_valid_category(missing.type, missing.category)

    # Fallback mode when artifact path does not exist must never crash
    fallback = parse_transaction_text(
        "bayar kosan bulanan 800rb",
        model_path="ml/artifacts/non_existent_model.joblib",
    )
    assert fallback.model_name == "KeywordFallback"
    assert fallback.amount == 800_000
    assert fallback.type == "expense"
    assert fallback.category == "Tagihan"
    assert is_valid_category(fallback.type, fallback.category)


def test_nlp_api_endpoints_and_security(client):
    # Unauthorized without Bearer token
    assert client.post("/api/v1/nlp/parse", json={"text": "kopi 20k"}).status_code == 401
    assert client.get("/api/v1/nlp/metrics").status_code == 401

    headers = _auth_headers(client)

    # Validation error on empty text
    empty_res = client.post("/api/v1/nlp/parse", headers=headers, json={"text": "   "})
    assert empty_res.status_code == 422

    parse_res = client.post(
        "/api/v1/nlp/parse",
        headers=headers,
        json={"text": "beli 2 kopi susu gula aren 36rb"},
    )
    assert parse_res.status_code == 200
    body = parse_res.json()
    assert body["amount"] == 36_000
    assert body["type"] == "expense"
    assert body["category"] == "Gaya Hidup"
    assert body["description"] == "Beli 2 kopi susu gula aren"
    assert body["needsConfirmation"] is False

    metrics_res = client.get("/api/v1/nlp/metrics", headers=headers)
    assert metrics_res.status_code == 200
    metrics = metrics_res.json()
    assert metrics["dataset"]["totalUniqueRows"] >= 800
    assert len(metrics["models"]) == 2
    assert metrics["selectedMetrics"]["macroF1"] >= 0.85
