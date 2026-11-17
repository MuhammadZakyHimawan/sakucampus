from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.core.categories import ExpenseCategory, IncomeCategory

AMOUNT_WITH_UNIT = re.compile(
    r"(?<!\w)(?P<value>\d+(?:[.,]\d{1,2})?)\s*"
    r"(?P<unit>ribuan|ribu|rb|k|juta|jt)\b",
    re.IGNORECASE,
)
PLAIN_AMOUNT = re.compile(r"(?<![\d.,])(?P<value>\d{1,3}(?:\.\d{3})+|\d{4,})(?![\d.,])")
CURRENCY_PREFIX = re.compile(r"\brp\.?\s*", re.IGNORECASE)

UNIT_MULTIPLIERS = {
    "ribuan": 1_000,
    "ribu": 1_000,
    "rb": 1_000,
    "k": 1_000,
    "juta": 1_000_000,
    "jt": 1_000_000,
}
MAX_AMOUNT = 1_000_000_000

INCOME_KEYWORDS = (
    "uang saku",
    "uang bulanan",
    "uang jajan",
    "beasiswa",
    "kip",
    "gaji",
    "part time",
    "part-time",
    "magang",
    "hadiah",
    "bonus",
)
EXPENSE_CATEGORY_KEYWORDS: tuple[tuple[ExpenseCategory, tuple[str, ...]], ...] = (
    (
        "Tagihan",
        (
            "kos",
            "kontrakan",
            "sewa",
            "listrik",
            "air",
            "wifi",
            "internet",
            "pulsa",
            "bpjs",
            "cicilan",
            "spp",
        ),
    ),
    (
        "Transportasi",
        ("bensin", "ojek", "gojek", "grab", "angkot", "bus", "tiket", "parkir", "tol", "kereta"),
    ),
    (
        "Pendidikan",
        ("buku", "kuliah", "modul", "printing", "print", "skripsi", "kursus", "uts", "uas"),
    ),
    ("Kesehatan", ("obat", "dokter", "klinik", "rumah sakit", "vitamin")),
    ("Gaya Hidup", ("kopi", "jajan", "snack", "baju", "game", "netflix", "spotify", "nongkrong")),
    ("Kebutuhan Primer", ("makan", "nasi", "ayam", "sayur", "lauk", "sarapan", "belanja")),
)
INCOME_CATEGORY_KEYWORDS: tuple[tuple[IncomeCategory, tuple[str, ...]], ...] = (
    ("Beasiswa", ("beasiswa", "kip")),
    ("Gaji/Part-time", ("gaji", "part time", "part-time", "magang")),
    ("Hadiah", ("hadiah", "bonus")),
    ("Uang Saku", ("uang saku", "uang bulanan", "uang jajan")),
)


@dataclass(frozen=True)
class ParsedTransaction:
    description: str
    amount: int
    type: Literal["income", "expense"]
    category: ExpenseCategory | IncomeCategory
    date: date


def _extract_amounts(text: str) -> list[int]:
    with_unit = [
        int(
            round(
                float(match.group("value").replace(",", "."))
                * UNIT_MULTIPLIERS[match.group("unit").lower()]
            )
        )
        for match in AMOUNT_WITH_UNIT.finditer(text)
    ]
    if with_unit:
        return with_unit

    return [int(match.group("value").replace(".", "")) for match in PLAIN_AMOUNT.finditer(text)]


def _detect_type(text: str) -> Literal["income", "expense"]:
    return "income" if any(keyword in text for keyword in INCOME_KEYWORDS) else "expense"


def _detect_category(
    text: str,
    transaction_type: Literal["income", "expense"],
) -> ExpenseCategory | IncomeCategory:
    rules = INCOME_CATEGORY_KEYWORDS if transaction_type == "income" else EXPENSE_CATEGORY_KEYWORDS

    for category, keywords in rules:
        if any(keyword in text for keyword in keywords):
            return category

    return "Lainnya"


def parse_transaction(text: str, *, today: date) -> ParsedTransaction | None:
    if not isinstance(text, str):
        return None

    normalized = CURRENCY_PREFIX.sub(" ", text).strip().lower()
    if not normalized or "transfer" in normalized:
        return None

    amounts = _extract_amounts(normalized)
    if len(amounts) != 1:
        return None

    amount = amounts[0]
    if amount <= 0 or amount > MAX_AMOUNT:
        return None

    description = text.strip()[:500]
    if not description:
        return None

    transaction_type = _detect_type(normalized)

    return ParsedTransaction(
        description=description,
        amount=amount,
        type=transaction_type,
        category=_detect_category(normalized, transaction_type),
        date=today,
    )
