from __future__ import annotations

import re

# Common Indonesian student chat abbreviations normalized before TF-IDF
_SLANG_MAP: dict[str, str] = {
    "mkn": "makan",
    "mkan": "makan",
    "mnm": "minum",
    "blj": "belanja",
    "blnja": "belanja",
    "bli": "beli",
    "byr": "bayar",
    "bnsin": "bensin",
    "bnsn": "bensin",
    "prkir": "parkir",
    "ojol": "ojek online",
    "gocar": "taksi online",
    "grabcar": "taksi online",
    "goride": "ojek online",
    "grabride": "ojek online",
    "tj": "transjakarta",
    "krl": "kereta",
    "mrt": "kereta",
    "lrt": "kereta",
    "ftkopi": "fotokopi",
    "fc": "fotokopi",
    "fotocopy": "fotokopi",
    "skripsi": "kuliah",
    "praktikum": "praktikum",
    "kosan": "kos",
    "indekos": "kos",
    "listrk": "listrik",
    "plsa": "pulsa",
    "inet": "internet",
    "wifi": "internet",
    "ortu": "orang tua",
    "bokap": "ayah",
    "nyokap": "ibu",
    "kiriman": "uang saku",
    "sangu": "uang saku",
    "asprak": "asisten praktikum",
    "asdos": "asisten dosen",
    "gajian": "gaji",
    "tf": "transfer",
    "trf": "transfer",
    "topup": "top up",
    "pindahin": "pindah",
    "nabung": "tabungan",
    "obat2an": "obat",
    "skt": "sakit",
    "rs": "rumah sakit",
    "puskes": "puskesmas",
    "nongki": "nongkrong",
    "ngopi": "kopi",
    "warkop": "kopi",
}

_MONEY_OR_DIGITS_RE = re.compile(
    r"(?:\brp\.?\s*\d[\d.,]*\s*(?:rb|rbu|ribu|jt|juta|k)?\b)"
    r"|(?:\b\d+(?:[.,]\d+)?\s*(?:rb|rbu|ribu|jt|juta|k)\b)"
    r"|(?:\b(?:seceng|noceng|goceng|ceban|noban|goban|cepek|cepe|sejuta)\b)"
    r"|(?:\b\d[\d.,]*\b)",
    re.IGNORECASE,
)
_NON_ALNUM_RE = re.compile(r"[^a-z\s]")
_MULTI_SPACE_RE = re.compile(r"\s+")


def preprocess_for_classification(text: str) -> str:
    """Case-fold, strip monetary amounts/pure digits, normalize student slang."""
    lowered = text.lower().strip()
    without_numbers = _MONEY_OR_DIGITS_RE.sub(" ", lowered)
    cleaned = _NON_ALNUM_RE.sub(" ", without_numbers)
    tokens = [_SLANG_MAP.get(token, token) for token in _MULTI_SPACE_RE.split(cleaned) if token]
    return " ".join(tokens).strip()
