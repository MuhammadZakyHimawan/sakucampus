from __future__ import annotations

import csv
import random
from pathlib import Path

from app.core.categories import is_valid_category
from app.modules.nlp.preprocessing import preprocess_for_classification

DATASET_PATH = Path(__file__).resolve().parent / "student_transactions_id.csv"

# Rich, realistic Indonesian student expressions per (type, category).
# Designed with colloquial Indonesian, campus slang, abbreviations, and natural typos.
_CATEGORY_TEMPLATES: list[tuple[str, str, list[str], list[str]]] = [
    (
        "expense",
        "Kebutuhan Primer",
        [
            "makan siang nasi padang lauk rendang",
            "mkn ayam geprek level pedas kantin fakultas",
            "sarapan bubur ayam depan gang kosan",
            "makan malam pecel lele lalapan",
            "warteg lauk telor balado sayur sop",
            "beli beras lima kilo di warung sembako",
            "isi ulang air galon kos",
            "blnja indomie telur sarden buat stok kamar",
            "beli lauk tempe orek tahu goreng warteg",
            "makan soto ayam kuah bening",
            "sarapan nasi uduk gorengan tiga biji",
            "mkan nasi goreng tek tek malam",
            "beli buah pisang pepaya potong pasar",
            "belanja sayur bayam wortel bumbu dapur",
            "makan bakso urat mie ayam dekat kampus",
            "beli roti tawar selai kacang buat sarapan",
            "katering harian mahasiswa menu ayam bakar",
            "mkn gado gado lontong kantin belakang",
            "beli susu uht dan sereal pagi",
            "belanja minyak goreng gula garam sabun mandi",
            "makan ketoprak telor dadar malam hari",
            "beli air mineral botol besar di minimarket",
            "mkn nasi kuning lauk perkedel",
            "beli lauk ayam sayur asem bungkus",
            "blj kebutuhan pokok sabun cuci piring deterjen",
        ],
        [
            "habis kuliah",
            "di kantin",
            "dekat kos",
            "bareng teman",
            "bungkus bawa pulang",
            "tadi siang",
            "sore ini",
            "malam tadi",
        ],
    ),
    (
        "expense",
        "Gaya Hidup",
        [
            "ngopi kopi susu gula aren di kafe",
            "beli es boba brown sugar mall",
            "nongkrong warkop pesan kopi hitam kentang goreng",
            "nonton film bioskop xxi akhir pekan",
            "langganan spotify premium bulanan",
            "patungan akun netflix sharing sebulan",
            "jajan seblak ceker pedas malam minggu",
            "beli es krim cone matcha manis",
            "bli kaos polos thrift distro",
            "potong rambut cukur rapi barbershop",
            "beli skincare facial wash sunscreen moisturizer",
            "topup diamond game mobile legends",
            "nongki cafe pesan matcha latte croissant",
            "jajan martabak manis keju coklat",
            "beli parfum body mist minimarket",
            "karaoke sejam bareng anak kelas",
            "jajan dimsum mentai dan takoyaki",
            "beli casing hp baru aksesoris lucu",
            "langganan youtube premium student plan",
            "beli tiket konser musik pensi kampus",
            "jajan burger kebab keju sore",
            "main billiard dua jam sama teman",
            "beli celana jeans kemeja flanel",
            "pesan thai tea cincau ukuran jumbo",
            "beli cemilan keripik coklat buat nonton",
        ],
        [
            "sama anak himpunan",
            "sepulang praktikum",
            "malam minggu",
            "pas lagi suntuk",
            "di mall dekat kampus",
            "via aplikasi pesan antar",
            "sore santai",
            "bareng sahabat",
        ],
    ),
    (
        "expense",
        "Pendidikan",
        [
            "fotokopi modul kuliah dan diktat dosen",
            "print laporan praktikum warna jilid spiral",
            "ftkopi bahan ujian tengah semester",
            "beli buku referensi algoritma pemrograman",
            "bayar cicilan ukt semester ganjil",
            "beli alat tulis pulpen stabilo buku catatan",
            "daftar seminar nasional sertifikat skpi",
            "beli kertas hvs satu rim tinta printer",
            "ikut kursus online persiapan toefl ielts",
            "print draft bab skripsi rangkap tiga",
            "beli komponen sensor arduino tugas proyek",
            "bayar iuran praktikum laboratorium komputer",
            "fc materi presentasi kelompok kelas",
            "beli binder loose leaf pembatas kertas",
            "daftar workshop data science mahasiswa",
            "jilid hardcopy laporan magang akhir",
            "beli kalkulator ilmiah kebutuhan ujian",
            "langganan jurnal referensi belajar kuliah",
            "beli map plastik amplop coklat berkas akademik",
            "cetak poster ilmiah pameran capstone",
        ],
        [
            "di tempat fotokopi kampus",
            "buat tugas besok",
            "keperluan mata kuliah wajib",
            "persiapan sidang",
            "semester ini",
            "bareng kelompok tugas",
        ],
    ),
    (
        "expense",
        "Transportasi",
        [
            "isi bensin pertalite motor full tank",
            "bnsin pertamax matic di spbu",
            "naik ojol goride berangkat ke kampus",
            "pesan grabride pulang dari stasiun",
            "isi saldo kartu krl commuter line",
            "tap kartu mrt dan transjakarta harian",
            "byr parkir motor gedung kuliah",
            "tambal ban motor bocor pinggir jalan",
            "ganti oli mesin servis ringan bengkel",
            "patungan gocar hujan deras pulang kos",
            "beli tiket kereta api pulang kampung",
            "naik angkot jurusan terminal kampus",
            "bayar tol perjalanan bareng teman",
            "ojol buru buru mengejar kelas pagi",
            "isi angin nitrogen dan cek rem motor",
            "pesan grabcar rombongan ke lokasi lomba",
            "prkir motor stasiun seharian",
            "beli jas hujan motor baru di jalan",
            "ongkos bus damri menuju bandara",
            "cuci motor kotor habis kehujanan",
        ],
        [
            "pagi tadi",
            "waktu berangkat kuliah",
            "pulang malam",
            "pas macet hujan",
            "arah fakultas",
            "perjalanan pergi pulang",
        ],
    ),
    (
        "expense",
        "Kesehatan",
        [
            "beli obat flu batuk demam di apotek",
            "tebus resep dokter klinik pratama",
            "beli vitamin daya tahan tubuh mahasiswa",
            "periksa sakit gigi tambal di puskesmas",
            "bli paracetamol dan obat maag promag",
            "beli minyak kayu putih balsem tolak angin",
            "konsultasi dokter umum karena radang tenggorokan",
            "beli plester luka betadine kasa steril",
            "cek darah laboratorium kesehatan kampus",
            "beli masker medis hand sanitizer tisu basah",
            "beli obat tetes mata iritasi layar laptop",
            "periksa skt perut di rumah sakit",
            "beli salep gatal alergi kulit apotek",
            "beli minuman elektrolit oralit saat diare",
            "kontrol kacamata minus optik dekat kampus",
            "beli suplemen zat besi multivitamin harian",
            "biaya administrasi berobat klinik malam",
            "beli termometer digital dan kompres demam",
        ],
        [
            "karena kecapekan begadang",
            "di apotek dekat kos",
            "malam tadi",
            "biar cepat sembuh",
            "habis kehujanan",
        ],
    ),
    (
        "expense",
        "Tagihan",
        [
            "bayar sewa kos bulanan ibu kos",
            "byr kosan kamar mandi dalam bulan ini",
            "beli token listrik pln kamar kos",
            "isi paket data kuota internet bulanan",
            "patungan bayar wifi indihome rumah kontrakan",
            "bayar laundry kiloan pakaian seminggu",
            "beli plsa reguler perpanjang masa aktif nomor",
            "iuran air bersih dan sampah lingkungan kos",
            "tagihan pascabayar kartu seluler bulanan",
            "byr listrk bulanan kontrakan mahasiswa",
            "cuci setrika selimut sprei di laundry",
            "perpanjang paket internet malam kuota belajar",
            "iuran keamanan warga sekitar indekos",
            "bayar sewa loker penyimpanan kampus",
            "isi ulang token pln bunyi tengah malam",
            "bayar langganan cloud storage backup tugas",
            "tagihan pdam kontrakan bareng teman",
            "paket telepon dan kuota utama operator",
        ],
        [
            "periode awal bulan",
            "rutin tiap bulan",
            "lewat m banking",
            "jatuh tempo minggu ini",
            "buat kebutuhan kos",
        ],
    ),
    (
        "expense",
        "Lainnya",
        [
            "infak sedekah jumat kotak amal masjid kampus",
            "donasi penggalangan dana bencana alam",
            "patungan beli kado ulang tahun teman sekelas",
            "bayar iuran kas himpunan mahasiswa jurusan",
            "denda keterlambatan pengembalian buku perpustakaan",
            "potongan biaya admin bulanan rekening bank",
            "duplikat kunci kamar kos dan gembok pagar",
            "servis resleting tas ransel kuliah rusak",
            "beli payung lipat baru di minimarket",
            "sumbangan sosial kunjungan panti asuhan",
            "patungan dekorasi acara malam keakraban angkatan",
            "jahit sol sepatu kuliah yang lepas",
            "beli gembok cakram pengaman motor",
            "biaya materai sepuluh ribu surat pernyataan",
            "bungkus kado kertas pita kartu ucapan",
            "kas kelas mingguan bendahara",
            "ganti lampu bohlam kamar kos putus",
            "beli baterai mouse wireless habis",
        ],
        [
            "hari jumat",
            "bareng teman angkatan",
            "kebutuhan mendadak",
            "tadi siang",
            "di sekitar kampus",
        ],
    ),
    (
        "income",
        "Uang Saku",
        [
            "kiriman uang saku bulanan dari orang tua",
            "transfer bulanan ayah masuk rekening",
            "dikasih sangu mingguan sama ibu",
            "uang jajan bulanan dari ortu",
            "tambahan uang makan kiriman bokap",
            "terima uang bulanan kos dan makan dari nyokap",
            "jatah uang saku awal bulan sudah cair",
            "kiriman dana hidup perantauan dari rumah",
            "uang pegangan minggu ini dari ayah",
            "transferan uang saku adik kakak dari orang tua",
            "dikasih tambahan uang transport sama ibu",
            "uang saku kuliah semester baru dari ortu",
            "masuk kiriman rutin bulanan keluarga",
            "tambahan sangu akhir bulan dari rumah",
        ],
        [
            "awal bulan",
            "masuk rekening bca",
            "via transfer bank",
            "hari ini",
            "buat sebulan",
            "alhamdulillah cair",
        ],
    ),
    (
        "income",
        "Beasiswa",
        [
            "pencairan dana beasiswa kip kuliah semester ini",
            "terima uang saku beasiswa prestasi akademik",
            "dana bantuan biaya hidup beasiswa unggulan cair",
            "tunjangan bulanan penerima beasiswa bank indonesia",
            "beasiswa yayasan pendidikan masuk rekening",
            "bantuan ukt dan uang buku dari beasiswa kampus",
            "insentif riset skripsi hibah mahasiswa cair",
            "pencairan beasiswa daerah pemerintah provinsi",
            "terima dana apresiasi mahasiswa berprestasi fakultas",
            "uang pembinaan beasiswa aktivis organisasi",
            "dana beasiswa baznas mahasiswa rantau masuk",
            "pencairan termin kedua beasiswa korporat",
        ],
        [
            "semester berjalan",
            "masuk rekening bri",
            "hari ini",
            "resmi cair",
            "periode bulanan",
        ],
    ),
    (
        "income",
        "Gaji/Part-time",
        [
            "honor asisten praktikum laboratorium cair",
            "gaji kerja part time barista kedai kopi",
            "fee proyek freelance pembuatan website klien",
            "bayaran mengajar les privat matematika sma",
            "upah asdos koreksi tugas dan pengawas ujian",
            "komisi desain poster sosial media umkm",
            "uang saku magang industri bulanan gajian",
            "hasil jasa ketik dan olah data statistik",
            "honor panitia event kampus dokumentasi foto",
            "pendapatan jualan risoles mayo di kelas",
            "fee freelance terjemahan artikel bahasa inggris",
            "komisi afiliasi toko online cair ke rekening",
            "bayaran jasa instal ulang laptop teman",
            "insentif kerja paruh waktu admin toko online",
        ],
        [
            "bulan ini",
            "sudah ditransfer klien",
            "hasil kerja minggu lalu",
            "masuk rekening",
            "sore tadi",
        ],
    ),
    (
        "income",
        "Hadiah",
        [
            "dapat thr lebaran dari paman dan bibi",
            "hadiah uang ulang tahun dari kakak kandung",
            "uang pembinaan juara lomba karya tulis ilmiah",
            "hadiah menang kompetisi ui ux tingkat nasional",
            "dikasih angpao silaturahmi acara keluarga besar",
            "rezeki nomplok dikasih nenek waktu berkunjung",
            "bonus hadiah kuis acara seminar kampus",
            "apresiasi kelulusan sidang proposal dari saudara",
            "menang giveaway saldo dompet digital",
            "hadiah juara harapan hackathon mahasiswa",
            "uang saku hadiah nilai ipk naik dari om",
            "bonus traktiran tunai ulang tahun keluarga",
        ],
        [
            "kemarin sore",
            "tunai langsung",
            "via transfer",
            "alhamdulillah rezeki",
            "akhir pekan",
        ],
    ),
    (
        "income",
        "Lainnya",
        [
            "hasil jual buku kuliah bekas ke adik tingkat",
            "uang pengembalian refund barang batal kirim",
            "teman bayar utang pinjaman makan minggu lalu",
            "laku jual kipas angin preloved kamar kos",
            "kembalian sisa dana patungan kegiatan kelas",
            "cashback promo pembayaran tagihan aplikasi",
            "jual kardus dan kertas bekas bersih bersih kos",
            "pengembalian deposit kunci kontrakan lama",
            "ganti uang talangan fotokopi dari teman kelompok",
            "hasil jual keyboard bekas pemakaian pribadi",
            "pencairan klaim penggantian biaya obat kampus",
            "terima pelunasan piutang teman kos",
        ],
        [
            "hari ini",
            "lewat qris",
            "sudah lunas",
            "masuk dompet",
            "tadi pagi",
        ],
    ),
    (
        "transfer",
        "Lainnya",
        [
            "transfer antar rekening sendiri bca ke seabank",
            "pindahin saldo rekening utama ke dompet gopay",
            "topup saldo ovo dari mobile banking pribadi",
            "isi saldo dana buat pegangan transaksi harian",
            "tarik tunai uang kas di atm dekat kampus",
            "setor tunai uang dompet masuk ke atm",
            "pindah dana ke rekening tabungan khusus pribadi",
            "topup shopeepay dari rekening bank sendiri",
            "mutasi internal kantong jago utama ke kantong bayar",
            "geser saldo tabungan ke rekening operasional harian",
            "tf ke akun ewallet sendiri tanpa biaya admin",
            "simpan uang tunai ke rekening bank pribadi",
        ],
        [
            "antar akun pribadi",
            "pagi ini",
            "lewat m banking",
            "tanpa potongan",
            "buat cadangan",
        ],
    ),
]

_NOMINAL_TOKENS = [
    "15rb",
    "20k",
    "25.000",
    "Rp 35.000",
    "50rb",
    "75k",
    "100 ribu",
    "150.000",
    "250rb",
    "500k",
    "850.000",
    "1,2jt",
    "goceng",
    "ceban",
    "noban",
    "goban",
]


def generate_dataset() -> int:
    rng = random.Random(42)
    rows: list[tuple[str, str, str]] = []
    seen_preprocessed: set[str] = set()

    for tx_type, category, bases, modifiers in _CATEGORY_TEMPLATES:
        assert is_valid_category(tx_type, category), f"Invalid: {tx_type} / {category}"
        # 1) Base sentences with varied nominal styles
        for base in bases:
            nominal = rng.choice(_NOMINAL_TOKENS)
            text = f"{base} {nominal}"
            prep = preprocess_for_classification(text)
            if prep and prep not in seen_preprocessed:
                seen_preprocessed.add(prep)
                rows.append((text, tx_type, category))

        # 2) Base + contextual modifier combinations (distinct semantic tokens)
        for base in bases:
            chosen_mods = rng.sample(modifiers, k=min(4, len(modifiers)))
            for mod in chosen_mods:
                nominal = rng.choice(_NOMINAL_TOKENS)
                if rng.random() < 0.5:
                    text = f"{base} {mod} {nominal}"
                else:
                    text = f"{mod} {base} {nominal}"
                prep = preprocess_for_classification(text)
                if prep and prep not in seen_preprocessed:
                    seen_preprocessed.add(prep)
                    rows.append((text, tx_type, category))

    rng.shuffle(rows)
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATASET_PATH.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow(["text", "transaction_type", "category"])
        writer.writerows(rows)

    return len(rows)


if __name__ == "__main__":
    count = generate_dataset()
    print(f"Dataset generated: {count} unique leakage-free rows -> {DATASET_PATH}")
