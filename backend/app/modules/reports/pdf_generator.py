from __future__ import annotations

import io
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Literal
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session

from app.models import Transaction, User
from app.modules.rule_engine.metrics import format_rupiah
from app.modules.rule_engine.service import evaluate_user_finances
from app.services.analytics_service import (
    format_short_date_id,
    get_period_range,
    group_expenses_by_category,
)
from app.services.budget_service import list_budgets
from app.services.goal_service import list_goals
from app.services.transaction_service import list_transactions

ReportPeriodPreset = Literal["7d", "30d", "month", "all"]

WIB = timezone(timedelta(hours=7))

# SakuCampus Brand Palette (Master Spec Section 8.2)
COLOR_PRIMARY = colors.HexColor("#336799")
COLOR_PRIMARY_DARK = colors.HexColor("#1D4B76")
COLOR_PRIMARY_LIGHT = colors.HexColor("#E7F4F6")
COLOR_INK = colors.HexColor("#112958")
COLOR_MUTED = colors.HexColor("#54647B")
COLOR_BORDER = colors.HexColor("#DFE9EB")
COLOR_ZEBRA = colors.HexColor("#F6F9FB")
COLOR_SUCCESS = colors.HexColor("#0A7A47")
COLOR_SUCCESS_BG = colors.HexColor("#E6F5EE")
COLOR_WARNING = colors.HexColor("#8F6300")
COLOR_WARNING_BG = colors.HexColor("#FFF8E6")
COLOR_DANGER = colors.HexColor("#B84A43")
COLOR_DANGER_BG = colors.HexColor("#FCECEB")

_UNICODE_REPLACEMENTS = str.maketrans(
    {
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u2026": "...",
        "\u00a0": " ",
    }
)

_INDONESIAN_MONTHS_FULL = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
)

_TX_TYPE_LABELS: dict[str, str] = {
    "income": "Pemasukan",
    "expense": "Pengeluaran",
    "transfer": "Transfer",
}

_BUDGET_STATUS_LABELS: dict[str, str] = {
    "safe": "Aman",
    "warning": "Waspada",
    "exceeded": "Terlampaui",
}

_SEVERITY_LABELS: dict[str, str] = {
    "normal": "NORMAL",
    "warning": "WASPADA",
    "critical": "KRITIS",
}


def sanitize_pdf_text(value: str | None) -> str:
    """Sanitize text for ReportLab standard Latin-1 fonts (strips emoji/unsupported glyphs)."""
    if not value:
        return ""
    translated = value.translate(_UNICODE_REPLACEMENTS)
    latin_safe = translated.encode("latin-1", errors="ignore").decode("latin-1")
    cleaned = " ".join(latin_safe.split())
    return cleaned if cleaned else "-"


def _para_text(value: str | None) -> str:
    return xml_escape(sanitize_pdf_text(value))


def _format_date_id(value: date) -> str:
    return f"{value.day:02d} {_INDONESIAN_MONTHS_FULL[value.month - 1]} {value.year}"


class _NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to render 'Halaman X dari Y' footer on every page."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._saved_page_states: list[dict] = []

    def showPage(self) -> None:  # noqa: N802
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        total_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total_pages)
            super().showPage()
        super().save()

    def _draw_footer(self, total_pages: int) -> None:
        self.saveState()
        page_width, _ = A4
        margin_x = 15 * mm
        footer_y = 10 * mm

        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(margin_x, footer_y + 4 * mm, page_width - margin_x, footer_y + 4 * mm)

        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_MUTED)
        self.drawString(
            margin_x,
            footer_y,
            "SakuCampus - Sistem Konsultan Keuangan Cerdas Mahasiswa",
        )
        self.drawRightString(
            page_width - margin_x,
            footer_y,
            f"Halaman {self._pageNumber} dari {total_pages}",
        )
        self.restoreState()


def _resolve_report_period(
    all_transactions: list[Transaction],
    *,
    preset: ReportPeriodPreset | None,
    start_date: date | None,
    end_date: date | None,
    reference_date: date,
) -> tuple[date, date, str]:
    if start_date is not None and end_date is not None:
        label = f"{format_short_date_id(start_date)} - {format_short_date_id(end_date)}"
        return start_date, end_date, label

    effective = preset or "30d"
    if effective == "all":
        if all_transactions:
            min_date = min(tx.date for tx in all_transactions)
            max_date = max(max(tx.date for tx in all_transactions), reference_date)
            return min_date, max_date, "Semua Periode"
        return reference_date.replace(day=1), reference_date, "Semua Periode"

    pr = get_period_range(effective, reference_date)
    return pr.start, pr.end, pr.label


def _status_colors(status: str) -> tuple[colors.Color, colors.Color]:
    if status == "critical":
        return COLOR_DANGER, COLOR_DANGER_BG
    if status == "warning":
        return COLOR_WARNING, COLOR_WARNING_BG
    return COLOR_SUCCESS, COLOR_SUCCESS_BG


def _base_table_style(header_bg: colors.Color = COLOR_PRIMARY_DARK) -> list[tuple]:
    return [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), COLOR_INK),
        ("TOPPADDING", (0, 1), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]


def generate_financial_report_pdf(
    db: Session,
    user: User,
    *,
    preset: ReportPeriodPreset | None = "30d",
    start_date: date | None = None,
    end_date: date | None = None,
    reference_date: date | None = None,
) -> tuple[bytes, str]:
    ref_date = reference_date or date.today()
    all_transactions = list_transactions(db, user.id)
    p_start, p_end, p_label = _resolve_report_period(
        all_transactions,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
        reference_date=ref_date,
    )

    period_transactions = [tx for tx in all_transactions if p_start <= tx.date <= p_end]
    budgets = list_budgets(db, user.id)
    goals = list_goals(db, user.id)

    eval_result = evaluate_user_finances(
        db,
        user.id,
        persist_notifications=False,
        reference_date=p_end,
        period_start=p_start,
        period_end=p_end,
        evaluate_all_budgets=True,
    )
    metrics = eval_result.metrics
    categories = group_expenses_by_category(period_transactions)

    buffer = io.BytesIO()
    content_width = A4[0] - 30 * mm  # 180mm usable width

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=14 * mm,
        bottomMargin=18 * mm,
        title="Laporan Keuangan SakuCampus",
        author="SakuCampus",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SC_Title",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=COLOR_INK,
    )
    subtitle_style = ParagraphStyle(
        "SC_Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=COLOR_MUTED,
    )
    section_style = ParagraphStyle(
        "SC_Section",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=COLOR_PRIMARY_DARK,
        spaceBefore=4,
        spaceAfter=5,
    )
    cell_style = ParagraphStyle(
        "SC_Cell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11,
        textColor=COLOR_INK,
        alignment=TA_LEFT,
    )
    cell_muted_style = ParagraphStyle(
        "SC_CellMuted",
        parent=cell_style,
        textColor=COLOR_MUTED,
    )
    badge_fg, badge_bg = _status_colors(eval_result.financial_status)
    badge_style = ParagraphStyle(
        "SC_Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        alignment=TA_CENTER,
        textColor=badge_fg,
    )
    right_num_style = ParagraphStyle(
        "SC_RightNum",
        parent=cell_style,
        alignment=TA_RIGHT,
    )

    printed_at = datetime.now(UTC).astimezone(WIB).strftime("%d %b %Y, %H:%M WIB")
    status_label = _SEVERITY_LABELS.get(eval_result.financial_status, "NORMAL")

    story: list = []

    # 1. HEADER / KOP LAPORAN
    header_left = [
        Paragraph("SakuCampus - Laporan Keuangan Mahasiswa", title_style),
        Spacer(1, 2 * mm),
        Paragraph(
            f"<b>Nama:</b> {_para_text(user.name)} &nbsp;|&nbsp; "
            f"<b>Email:</b> {_para_text(user.email)}",
            subtitle_style,
        ),
        Paragraph(
            f"<b>Periode:</b> {_format_date_id(p_start)} - {_format_date_id(p_end)} "
            f"({_para_text(p_label)}) &nbsp;|&nbsp; <b>Dicetak:</b> {printed_at}",
            subtitle_style,
        ),
    ]
    badge_box = Table(
        [[Paragraph(f"STATUS KEUANGAN<br/>{status_label}", badge_style)]],
        colWidths=[42 * mm],
    )
    badge_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
                ("BOX", (0, 0), (-1, -1), 1, badge_fg),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    header_table = Table(
        [[header_left, badge_box]],
        colWidths=[content_width - 45 * mm, 45 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_PRIMARY_LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.8, COLOR_PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 5 * mm))

    # 2. RINGKASAN EKSEKUTIF (KPI SUMMARY TABLE)
    story.append(Paragraph("1. Ringkasan Eksekutif", section_style))
    if metrics.runway_days is None:
        runway_str = "Aman / Belum ada laju pengeluaran"
    elif metrics.runway_days <= 0:
        runway_str = "0 hari (Saldo habis / defisit)"
    else:
        runway_str = f"{metrics.runway_days:g} hari"

    kpi_rows = [
        ["Indikator Keuangan", "Nilai", "Keterangan"],
        [
            "Saldo Berjalan Saat Ini",
            format_rupiah(metrics.balance),
            (
                f"Saldo awal {format_rupiah(metrics.initial_balance)} "
                f"(batas min. {format_rupiah(metrics.min_balance)})"
            ),
        ],
        [
            "Total Pemasukan Periode",
            format_rupiah(metrics.period_income),
            f"Rentang {_format_date_id(p_start)} - {_format_date_id(p_end)}",
        ],
        [
            "Total Pengeluaran Periode",
            format_rupiah(metrics.period_expense),
            "Tidak termasuk transfer antar akun pribadi",
        ],
        [
            "Arus Kas Bersih (Net Cash Flow)",
            format_rupiah(metrics.net_cash_flow),
            "Surplus periode ini" if metrics.net_cash_flow >= 0 else "Defisit periode ini",
        ],
        [
            "Daily Burn Rate",
            f"{format_rupiah(metrics.daily_burn_rate)} / hari",
            f"Rata-rata pengeluaran ({metrics.elapsed_days} hari evaluasi)",
        ],
        [
            "Batas Aman Pengeluaran Harian",
            f"{format_rupiah(metrics.safe_daily_spend)} / hari",
            f"Agar saldo di atas batas minimum ({metrics.remaining_days_in_month} hari sisa bulan)",
        ],
        [
            "Estimasi Ketahanan Dana (Runway)",
            runway_str,
            f"Total transaksi pada periode ini: {len(period_transactions)} transaksi",
        ],
    ]
    kpi_table = Table(
        kpi_rows,
        colWidths=[58 * mm, 44 * mm, content_width - 102 * mm],
        repeatRows=1,
    )
    kpi_style = _base_table_style(COLOR_PRIMARY)
    kpi_style.extend(
        [
            ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
            ("ALIGN", (1, 1), (1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_ZEBRA]),
        ]
    )
    kpi_table.setStyle(TableStyle(kpi_style))
    story.append(kpi_table)
    story.append(Spacer(1, 5 * mm))

    # 3. PERINGATAN & REKOMENDASI PROACTIVE RULE ENGINE
    story.append(Paragraph("2. Evaluasi & Rekomendasi Konsultan (Rule Engine)", section_style))
    if not eval_result.alerts:
        ok_table = Table(
            [
                [
                    Paragraph(
                        "<b>NORMAL - Kondisi Keuangan Terkendali:</b> Saldo berada di atas "
                        "batas minimum, tidak ada anggaran yang melampaui ambang batas, dan "
                        "arus kas dalam kondisi sehat. Pertahankan kebiasaan mencatat rutin!",
                        cell_style,
                    )
                ]
            ],
            colWidths=[content_width],
        )
        ok_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), COLOR_SUCCESS_BG),
                    ("BOX", (0, 0), (-1, -1), 0.7, COLOR_SUCCESS),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(ok_table)
    else:
        alert_rows: list[list] = [["Tingkat", "Temuan", "Rekomendasi & Rincian"]]
        for finding in eval_result.alerts:
            sev_label = _SEVERITY_LABELS.get(finding.severity, "INFO")
            alert_rows.append(
                [
                    sev_label,
                    Paragraph(f"<b>{_para_text(finding.title)}</b>", cell_style),
                    Paragraph(_para_text(finding.message), cell_style),
                ]
            )
        alert_table = Table(
            alert_rows,
            colWidths=[24 * mm, 48 * mm, content_width - 72 * mm],
            repeatRows=1,
        )
        a_style = _base_table_style(COLOR_PRIMARY_DARK)
        a_style.append(("ALIGN", (0, 1), (0, -1), "CENTER"))
        a_style.append(("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"))
        for idx, finding in enumerate(eval_result.alerts, start=1):
            fg, bg = _status_colors(finding.severity)
            a_style.append(("BACKGROUND", (0, idx), (0, idx), bg))
            a_style.append(("TEXTCOLOR", (0, idx), (0, idx), fg))
        alert_table.setStyle(TableStyle(a_style))
        story.append(alert_table)
    story.append(Spacer(1, 5 * mm))

    # 4. RINGKASAN PENGELUARAN PER KATEGORI
    story.append(Paragraph("3. Distribusi Pengeluaran per Kategori", section_style))
    if not categories:
        story.append(
            Paragraph("Belum ada transaksi pengeluaran pada periode ini.", cell_muted_style)
        )
    else:
        total_exp = max(1, metrics.period_expense)
        cat_rows: list[list] = [["Kategori Pengeluaran", "Nominal Terpakai", "Porsi (%)"]]
        for cat in categories:
            share = round((cat.total / total_exp) * 100, 1)
            cat_rows.append(
                [
                    sanitize_pdf_text(cat.category),
                    format_rupiah(cat.total),
                    f"{share:.1f}%",
                ]
            )
        cat_table = Table(
            cat_rows,
            colWidths=[content_width - 76 * mm, 46 * mm, 30 * mm],
            repeatRows=1,
        )
        c_style = _base_table_style(COLOR_PRIMARY)
        c_style.extend(
            [
                ("ALIGN", (1, 1), (2, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_ZEBRA]),
            ]
        )
        cat_table.setStyle(TableStyle(c_style))
        story.append(cat_table)
    story.append(Spacer(1, 5 * mm))

    # 5. REALISASI ANGGARAN (BUDGETS)
    story.append(Paragraph("4. Realisasi Anggaran per Kategori", section_style))
    if not budgets or not metrics.budget_usages:
        story.append(
            Paragraph("Belum ada anggaran kategori yang diatur oleh pengguna.", cell_muted_style)
        )
    else:
        b_rows: list[list] = [["Kategori", "Periode", "Batas", "Terpakai", "Sisa", "%", "Status"]]
        for usage in metrics.budget_usages:
            b_rows.append(
                [
                    sanitize_pdf_text(usage.category),
                    (
                        f"{format_short_date_id(usage.period_start)} - "
                        f"{format_short_date_id(usage.period_end)}"
                    ),
                    format_rupiah(usage.limit_amount),
                    format_rupiah(usage.spent),
                    format_rupiah(usage.remaining),
                    f"{usage.percentage_int}%",
                    _BUDGET_STATUS_LABELS.get(usage.status, "Aman"),
                ]
            )
        b_table = Table(
            b_rows,
            colWidths=[34 * mm, 34 * mm, 27 * mm, 27 * mm, 26 * mm, 12 * mm, 20 * mm],
            repeatRows=1,
        )
        b_style = _base_table_style(COLOR_PRIMARY_DARK)
        b_style.extend(
            [
                ("ALIGN", (2, 1), (5, -1), "RIGHT"),
                ("ALIGN", (6, 1), (6, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_ZEBRA]),
            ]
        )
        b_table.setStyle(TableStyle(b_style))
        story.append(b_table)
    story.append(Spacer(1, 5 * mm))

    # 6. PROGRES TARGET TABUNGAN (FINANCIAL GOALS)
    story.append(Paragraph("5. Progres Target Tabungan (Financial Goals)", section_style))
    if not goals or not metrics.goal_progresses:
        story.append(
            Paragraph("Belum ada target tabungan yang dibuat oleh pengguna.", cell_muted_style)
        )
    else:
        g_rows: list[list] = [["Nama Target", "Terkumpul", "Nominal Target", "Progres", "Deadline"]]
        for gp in metrics.goal_progresses:
            g_rows.append(
                [
                    Paragraph(_para_text(gp.name), cell_style),
                    format_rupiah(gp.saved_amount),
                    format_rupiah(gp.target_amount),
                    f"{gp.percentage_int}%",
                    _format_date_id(gp.deadline),
                ]
            )
        g_table = Table(
            g_rows,
            colWidths=[content_width - 114 * mm, 32 * mm, 32 * mm, 20 * mm, 30 * mm],
            repeatRows=1,
        )
        g_style = _base_table_style(COLOR_PRIMARY)
        g_style.extend(
            [
                ("ALIGN", (1, 1), (3, -1), "RIGHT"),
                ("ALIGN", (4, 1), (4, -1), "CENTER"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_ZEBRA]),
            ]
        )
        g_table.setStyle(TableStyle(g_style))
        story.append(g_table)
    story.append(Spacer(1, 5 * mm))

    # 7. RINCIAN TRANSAKSI PERIODE
    story.append(
        Paragraph(
            f"6. Rincian Transaksi Periode ({len(period_transactions)} Transaksi)",
            section_style,
        )
    )
    if not period_transactions:
        story.append(
            Paragraph(
                "Belum ada transaksi yang tercatat pada rentang periode ini.",
                cell_muted_style,
            )
        )
    else:
        tx_rows: list[list] = [["Tanggal", "Deskripsi", "Jenis", "Kategori", "Sumber", "Nominal"]]
        for tx in period_transactions:
            prefix = "+" if tx.type == "income" else ("-" if tx.type == "expense" else "")
            source_label = "Telegram" if tx.source == "telegram" else "Web"
            tx_rows.append(
                [
                    _format_date_id(tx.date),
                    Paragraph(_para_text(tx.description), cell_style),
                    _TX_TYPE_LABELS.get(tx.type, tx.type),
                    sanitize_pdf_text(tx.category),
                    source_label,
                    Paragraph(f"{prefix}{format_rupiah(tx.amount)}", right_num_style),
                ]
            )
        tx_table = Table(
            tx_rows,
            colWidths=[24 * mm, content_width - 126 * mm, 23 * mm, 31 * mm, 18 * mm, 30 * mm],
            repeatRows=1,
        )
        t_style = _base_table_style(COLOR_PRIMARY_DARK)
        t_style.extend(
            [
                ("ALIGN", (4, 1), (4, -1), "CENTER"),
                ("ALIGN", (5, 0), (5, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_ZEBRA]),
            ]
        )
        tx_table.setStyle(TableStyle(t_style))
        story.append(tx_table)

    doc.build(story, canvasmaker=_NumberedCanvas)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"SakuCampus_Laporan_{p_start.isoformat()}_{p_end.isoformat()}.pdf"
    return pdf_bytes, filename
