from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AmountParseResult:
    amount: int | None
    clean_description: str
    matched_token: str | None = None


@dataclass(frozen=True, slots=True)
class _Candidate:
    amount: int
    start: int
    end: int
    priority: int
    token: str


_MULTIPLIERS: dict[str, int] = {
    "k": 1_000,
    "rb": 1_000,
    "rbu": 1_000,
    "ribu": 1_000,
    "jt": 1_000_000,
    "juta": 1_000_000,
    "ratus ribu": 100_000,
}

_SLANG_AMOUNTS: dict[str, int] = {
    "seceng": 1_000,
    "noceng": 2_000,
    "goceng": 5_000,
    "ceban": 10_000,
    "noban": 20_000,
    "goban": 50_000,
    "cepek": 100_000,
    "cepe": 100_000,
    "sejuta": 1_000_000,
}

# Non-monetary context words immediately preceding "cepek"/"cepe"
_NON_MONETARY_CEPEK_CTX = re.compile(r"(?:nilai|skor|ujian|ulangan|ipk|poin)\s*$", re.IGNORECASE)
# Year context immediately preceding 4-digit numbers like 2025/2026
_YEAR_CTX = re.compile(r"(?:tahun|thn|angkatan|periode)\s*$", re.IGNORECASE)
# Per-unit marker (@15rb) so total amount (30rb) wins over unit price
_UNIT_PRICE_PREFIX = re.compile(r"@\s*$")

# 1) Explicit Rp/IDR + number (+ optional suffix)
_RP_PATTERN = re.compile(
    r"(?<![A-Za-z0-9])(?:rp\.?|idr)\s*"
    r"(?P<num>\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)"
    r"(?:\s*(?P<suffix>ratus\s+ribu|ribu|rbu|rb|juta|jt|k))?(?![A-Za-z0-9])",
    re.IGNORECASE,
)

# 2) Number + explicit multiplier suffix (15rb, 20k, 22.5k, 1,5jt, 2.5 juta)
_SUFFIX_PATTERN = re.compile(
    r"(?<![A-Za-z0-9@])(?P<at>@\s*)?"
    r"(?P<num>\d+(?:[.,]\d{1,2})?)"
    r"\s*(?P<suffix>ratus\s+ribu|ribu|rbu|rb|juta|jt|k)\b",
    re.IGNORECASE,
)

# 3) Indonesian nominal slang (goceng, ceban, noban, goban, cepek, sejuta)
_SLANG_PATTERN = re.compile(
    r"\b(?P<slang>seceng|noceng|goceng|ceban|noban|goban|cepek|cepe|sejuta)\b",
    re.IGNORECASE,
)

# 4) Thousand-separated Rupiah without Rp/suffix (e.g., 850.000, 25.000, 1.250.000)
_THOUSAND_SEP_PATTERN = re.compile(
    r"(?<![A-Za-z0-9.,])(?P<num>\d{1,3}(?:\.\d{3})+)(?![A-Za-z0-9.,])"
)

# 5) Plain integer >= 500 without suffix (e.g., 5000, 150000, 750000)
_PLAIN_INT_PATTERN = re.compile(r"(?<![A-Za-z0-9.,])(?P<num>\d{3,9})(?![A-Za-z0-9.,])")

_TRAILING_PRICE_WORDS = re.compile(
    r"\s+\b(?:sebesar|senilai|seharga|harga|total|cuma|habis)\s*$",
    re.IGNORECASE,
)


def _normalize_suffix(raw_suffix: str) -> str:
    return re.sub(r"\s+", " ", raw_suffix.strip().lower())


def _parse_number_with_suffix(num_str: str, suffix: str | None) -> int | None:
    if suffix:
        multiplier = _MULTIPLIERS[_normalize_suffix(suffix)]
        # With suffix (e.g. 22,5rb or 1.25 juta), treat separator as decimal
        if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", num_str) and multiplier == 1:
            value = float(num_str.replace(".", ""))
        else:
            value = float(num_str.replace(",", "."))
        amount = round(value * multiplier)
        return amount if amount > 0 else None

    # Without suffix: thousand grouping like 25.000 or 1,250,000
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", num_str):
        return int(num_str.replace(".", ""))
    if re.fullmatch(r"\d{1,3}(?:,\d{3})+", num_str):
        return int(num_str.replace(",", ""))
    if num_str.isdigit():
        return int(num_str)
    return None


def _overlaps(span: tuple[int, int], occupied: list[tuple[int, int]]) -> bool:
    s1, e1 = span
    return any(not (e1 <= s2 or s1 >= e2) for s2, e2 in occupied)


def _clean_description_from_span(raw_text: str, span: tuple[int, int] | None) -> str:
    if span is None:
        cleaned = raw_text.strip()
    else:
        start, end = span
        prefix = _TRAILING_PRICE_WORDS.sub("", raw_text[:start])
        suffix = raw_text[end:]
        # Remove leftover connector right around removed token
        suffix = re.sub(r"^\s*(?:rupiah|idr)\b", "", suffix, flags=re.IGNORECASE)
        cleaned = f"{prefix} {suffix}"

    cleaned = re.sub(r"\s+", " ", cleaned).strip(" \t\r\n-:;,./")
    if not cleaned:
        return "Transaksi"
    return cleaned[0].upper() + cleaned[1:]


def parse_amount_and_description(raw_text: str) -> AmountParseResult:
    text = raw_text.strip()
    if not text:
        return AmountParseResult(amount=None, clean_description="", matched_token=None)

    candidates: list[_Candidate] = []
    occupied: list[tuple[int, int]] = []

    # 1. Explicit Rp/IDR prefix (highest priority = 50 / 45 if @unit)
    for match in _RP_PATTERN.finditer(text):
        span = match.span()
        amount = _parse_number_with_suffix(match.group("num"), match.group("suffix"))
        if amount and amount > 0:
            is_unit = bool(_UNIT_PRICE_PREFIX.search(text[: span[0]]))
            candidates.append(
                _Candidate(
                    amount=amount,
                    start=span[0],
                    end=span[1],
                    priority=35 if is_unit else 50,
                    token=match.group(0),
                )
            )
            occupied.append(span)

    # 2. Explicit multiplier suffix (priority = 45, or 30 if @unit)
    for match in _SUFFIX_PATTERN.finditer(text):
        span = match.span()
        if _overlaps(span, occupied):
            continue
        amount = _parse_number_with_suffix(match.group("num"), match.group("suffix"))
        if amount and amount > 0:
            is_unit = bool(match.group("at")) or bool(_UNIT_PRICE_PREFIX.search(text[: span[0]]))
            candidates.append(
                _Candidate(
                    amount=amount,
                    start=span[0],
                    end=span[1],
                    priority=30 if is_unit else 45,
                    token=match.group(0),
                )
            )
            occupied.append(span)

    # 3. Slang nominals (priority = 40)
    for match in _SLANG_PATTERN.finditer(text):
        span = match.span()
        if _overlaps(span, occupied):
            continue
        slang_key = match.group("slang").lower()
        if slang_key in {"cepek", "cepe"} and _NON_MONETARY_CEPEK_CTX.search(text[: span[0]]):
            continue
        amount = _SLANG_AMOUNTS[slang_key]
        candidates.append(
            _Candidate(
                amount=amount,
                start=span[0],
                end=span[1],
                priority=40,
                token=match.group(0),
            )
        )
        occupied.append(span)

    # 4. Thousand-separated integers like 850.000 (priority = 38)
    for match in _THOUSAND_SEP_PATTERN.finditer(text):
        span = match.span()
        if _overlaps(span, occupied):
            continue
        amount = int(match.group("num").replace(".", ""))
        if amount >= 500:
            candidates.append(
                _Candidate(
                    amount=amount,
                    start=span[0],
                    end=span[1],
                    priority=38,
                    token=match.group(0),
                )
            )
            occupied.append(span)

    # 5. Plain integers >= 500 (priority = 25; ignores small quantities like 2, 3, etc.)
    for match in _PLAIN_INT_PATTERN.finditer(text):
        span = match.span()
        if _overlaps(span, occupied):
            continue
        amount = int(match.group("num"))
        if amount < 500:
            continue
        if 1990 <= amount <= 2050 and _YEAR_CTX.search(text[: span[0]]):
            continue
        candidates.append(
            _Candidate(
                amount=amount,
                start=span[0],
                end=span[1],
                priority=25,
                token=match.group(0),
            )
        )
        occupied.append(span)

    if not candidates:
        return AmountParseResult(
            amount=None,
            clean_description=_clean_description_from_span(text, None),
            matched_token=None,
        )

    # Choose highest priority; tie-break by rightmost position (total appears after unit)
    best = max(candidates, key=lambda c: (c.priority, c.start, c.amount))
    clean_desc = _clean_description_from_span(text, (best.start, best.end))
    return AmountParseResult(
        amount=best.amount,
        clean_description=clean_desc,
        matched_token=best.token,
    )
