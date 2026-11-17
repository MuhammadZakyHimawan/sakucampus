from typing import Literal, get_args

TransactionType = Literal["income", "expense", "transfer"]
TransactionSource = Literal["manual", "telegram"]
NotificationType = Literal["budget", "balance", "goal", "info"]
PeriodPreset = Literal["7d", "30d", "month"]

ExpenseCategory = Literal[
    "Kebutuhan Primer",
    "Gaya Hidup",
    "Pendidikan",
    "Transportasi",
    "Kesehatan",
    "Tagihan",
    "Lainnya",
]

IncomeCategory = Literal[
    "Uang Saku",
    "Beasiswa",
    "Gaji/Part-time",
    "Hadiah",
    "Lainnya",
]

TRANSACTION_TYPES: tuple[TransactionType, ...] = get_args(TransactionType)
TRANSACTION_SOURCES: tuple[TransactionSource, ...] = get_args(TransactionSource)
NOTIFICATION_TYPES: tuple[NotificationType, ...] = get_args(NotificationType)
EXPENSE_CATEGORIES: tuple[ExpenseCategory, ...] = get_args(ExpenseCategory)
INCOME_CATEGORIES: tuple[IncomeCategory, ...] = get_args(IncomeCategory)


def categories_for_type(transaction_type: TransactionType) -> tuple[str, ...]:
    if transaction_type == "expense":
        return EXPENSE_CATEGORIES
    if transaction_type == "income":
        return INCOME_CATEGORIES
    return ("Lainnya",)
