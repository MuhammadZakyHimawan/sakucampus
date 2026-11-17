from datetime import date

import pytest

from app.services.telegram_parser import parse_transaction

TODAY = date(2026, 11, 17)


@pytest.mark.parametrize(
    ("text", "amount", "transaction_type", "category"),
    [
        ("makan ayam 20rb", 20_000, "expense", "Kebutuhan Primer"),
        ("beli kopi 15 ribu", 15_000, "expense", "Gaya Hidup"),
        ("bayar kos 750000", 750_000, "expense", "Tagihan"),
        ("uang saku 500rb", 500_000, "income", "Uang Saku"),
        ("beasiswa 1,5jt", 1_500_000, "income", "Beasiswa"),
        ("bensin 50k", 50_000, "expense", "Transportasi"),
        ("obat 25.000", 25_000, "expense", "Kesehatan"),
        ("buku 100ribu", 100_000, "expense", "Pendidikan"),
        ("Rp20.000 jajan", 20_000, "expense", "Gaya Hidup"),
        ("makan 2 porsi 20rb", 20_000, "expense", "Kebutuhan Primer"),
        ("gaji part time 1 juta", 1_000_000, "income", "Gaji/Part-time"),
        ("hadiah 200rb", 200_000, "income", "Hadiah"),
    ],
)
def test_parse_known_formats(text, amount, transaction_type, category):
    parsed = parse_transaction(text, today=TODAY)

    assert parsed is not None
    assert parsed.amount == amount
    assert parsed.type == transaction_type
    assert parsed.category == category
    assert parsed.date == TODAY
    assert parsed.description == text.strip()


@pytest.mark.parametrize(
    "text",
    [
        "makan ayam",
        "kopi 15 rb dan makan 20 rb",
        "uang saku 0rb",
        "uang saku 5000000000",
        "transfer 100rb ke budi",
        "   ",
    ],
)
def test_parse_rejects_unsupported_messages(text):
    assert parse_transaction(text, today=TODAY) is None


def test_parse_rejects_non_string_input():
    assert parse_transaction(None, today=TODAY) is None


def test_parse_truncates_long_description():
    text = f"makan ayam {'a' * 600} 20rb"

    parsed = parse_transaction(text, today=TODAY)

    assert parsed is not None
    assert len(parsed.description) == 500
