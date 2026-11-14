# SAKUCAMPUS --- MASTER PROJECT SPECIFICATION

## Panduan Utama OpenCode untuk Pengembangan Website

**Versi:** 1.0\
**Fokus tahap:** Website MVP --- Frontend First\
**Tujuan pengerjaan hari ini:** Menghasilkan website SakuCampus yang
dapat dijalankan, memiliki navigasi lengkap, UI konsisten, responsive,
dan menggunakan mock data yang siap diintegrasikan dengan backend.

------------------------------------------------------------------------

# 1. Instruksi Utama untuk OpenCode

Kamu bertindak sebagai **Senior Full-Stack Engineer, Frontend Architect,
dan UI/UX-minded Product Engineer** yang bertanggung jawab membangun
SakuCampus.

Baca seluruh dokumen ini sebelum melakukan perubahan kode. Dokumen ini
adalah sumber kebenaran utama (single source of truth) untuk kebutuhan
produk, desain, struktur, dan ruang lingkup implementasi.

## Aturan kerja wajib

1.  **Audit repository terlebih dahulu.** Periksa file, framework,
    dependency, dan kode yang sudah ada sebelum membuat atau mengubah
    apa pun.
2.  Jika repository sudah memiliki implementasi, pertahankan bagian yang
    masih relevan. Jangan menghapus atau menimpa pekerjaan yang sudah
    ada tanpa alasan.
3.  Jangan langsung membuat semua file sekaligus. Susun rencana singkat,
    lalu implementasikan secara bertahap.
4.  Prioritaskan website frontend yang benar-benar bisa dijalankan,
    bukan sekadar mockup statis atau screenshot.
5.  Semua tombol, tautan, form, filter, tab, dropdown, modal, dan
    navigasi yang ditampilkan harus memiliki perilaku yang masuk akal.
    Jangan membuat kontrol dekoratif yang tidak berfungsi.
6.  Gunakan mock data dan mock service untuk fitur yang belum mempunyai
    backend. Pisahkan mock data dari komponen UI.
7.  Jangan berpura-pura bahwa Telegram, autentikasi, database, atau
    machine learning sudah terhubung jika integrasi belum dibuat.
8.  Jangan menyimpan secret, API key, password, atau token di source
    code.
9.  Jangan membuat fitur investasi otomatis, koneksi rekening bank, atau
    rekomendasi instrumen investasi. Fitur tersebut di luar MVP.
10. Setelah setiap tahap, jalankan pemeriksaan yang tersedia: lint,
    typecheck, test, dan build. Perbaiki error sebelum melanjutkan.
11. Gunakan komponen reusable dan hindari duplikasi kode.
12. Pastikan tampilan nyaman digunakan pada desktop, tablet, dan
    smartphone.
13. Jika ada keputusan kecil yang belum ditentukan, pilih solusi paling
    sederhana, konsisten, aman, dan mudah dikembangkan. Catat asumsi
    tersebut di dokumentasi, jangan berhenti untuk menanyakan hal yang
    tidak kritis.
14. Jangan mengganti stack atau menambahkan dependency besar tanpa
    alasan teknis yang jelas.
15. Setelah implementasi, berikan ringkasan file yang dibuat/diubah,
    fitur yang selesai, cara menjalankan aplikasi, dan hal yang masih
    menggunakan mock data.

## Urutan eksekusi

-   Tahap 0: Audit repository dan laporkan kondisi awal.
-   Tahap 1: Setup fondasi aplikasi dan design system.
-   Tahap 2: Layout utama, routing, dan navigasi.
-   Tahap 3: Public pages (landing, login, register).
-   Tahap 4: Student application pages.
-   Tahap 5: Mock data, interaksi, validasi, dan responsive behavior.
-   Tahap 6: QA, build, dokumentasi, dan laporan hasil.

Jangan berhenti setelah membuat rencana. Setelah audit, lanjutkan
implementasi kecuali terdapat blocker yang benar-benar menghalangi.

------------------------------------------------------------------------

# 2. Ringkasan Produk

## 2.1 Nama produk

**SakuCampus**

## 2.2 Deskripsi

SakuCampus adalah sistem konsultan keuangan proaktif yang dirancang
untuk membantu mahasiswa mengelola uang saku dan kebiasaan keuangannya.

SakuCampus menggabungkan website dashboard dengan Telegram Bot.
Mahasiswa dapat mencatat transaksi menggunakan bahasa sehari-hari
melalui Telegram, misalnya:

-   `makan ayam 20rb`
-   `uang saku 500rb`
-   `beli kopi 15 ribu`
-   `bayar kos 750000`

Sistem direncanakan menggunakan NLP untuk mengekstrak nominal dan
mengklasifikasikan kategori transaksi. Rule Engine akan mengevaluasi
kondisi keuangan, seperti penggunaan anggaran, saldo minimum, dan burn
rate, kemudian memberikan peringatan atau saran yang relevan.

Website menjadi pusat visualisasi, pengelolaan, dan pemantauan kondisi
keuangan.

## 2.3 Masalah yang ingin diselesaikan

1.  Mahasiswa sering tidak konsisten mencatat pengeluaran.
2.  Aplikasi pencatatan keuangan manual dapat terasa merepotkan.
3.  Mahasiswa sulit mengetahui kategori pengeluaran terbesar.
4.  Mahasiswa sering terlambat menyadari anggaran hampir habis.
5.  Mahasiswa membutuhkan informasi keuangan yang sederhana dan mudah
    dipahami.

## 2.4 Value proposition

**Catat keuangan semudah chatting, pahami kondisi keuangan tanpa
perhitungan manual.**

## 2.5 Target pengguna

Mahasiswa yang: - Mengelola uang saku bulanan atau mingguan. - Ingin
mengetahui pemasukan dan pengeluaran. - Membutuhkan pengingat
anggaran. - Ingin mulai membangun kebiasaan menabung. - Menginginkan
cara pencatatan yang praktis.

------------------------------------------------------------------------

# 3. Tujuan dan Batasan Implementasi Hari Ini

## 3.1 Objective

Membuat website frontend SakuCampus yang: - Memiliki identitas visual
yang konsisten. - Memiliki halaman publik dan halaman aplikasi
mahasiswa. - Memiliki navigasi yang berfungsi. - Memiliki data contoh
yang realistis. - Memiliki interaksi dasar yang berfungsi. - Responsive
untuk desktop dan mobile. - Dapat dijalankan secara lokal. - Siap
dihubungkan ke backend FastAPI di tahap berikutnya.

## 3.2 Di luar scope hari ini

Jangan implementasikan integrasi production berikut pada tahap ini: -
Telegram Bot API dan webhook asli. - Autentikasi backend sesungguhnya. -
PostgreSQL. - NLP Scikit-learn. - Rule Engine backend. - Pengiriman
email. - Payment gateway. - Integrasi rekening bank. - Deployment
production.

Boleh buat tampilan dan mock flow untuk fitur tersebut, tetapi tandai
dengan jelas sebagai simulasi.

## 3.3 Prinsip data

-   Semua angka pada mockup harus ditandai sebagai data demo atau
    contoh.
-   Data transaksi harus konsisten dengan saldo dan grafik.
-   Jangan membuat angka yang saling bertentangan antarhalaman.
-   Siapkan lapisan service agar mock data dapat diganti API tanpa
    menulis ulang komponen.

------------------------------------------------------------------------

# 4. Rekomendasi Teknologi

Gunakan stack berikut jika repository belum memiliki stack yang
ditentukan.

## Frontend

-   React
-   Vite
-   TypeScript
-   Tailwind CSS
-   React Router
-   Lucide React untuk ikon
-   Recharts untuk grafik
-   React Hook Form dan Zod untuk form jika dibutuhkan

## Backend tahap berikutnya

-   Python
-   FastAPI
-   PostgreSQL
-   SQLAlchemy
-   Alembic
-   Pydantic

## Machine Learning tahap berikutnya

-   Python
-   Pandas
-   NumPy
-   Scikit-learn
-   TF-IDF
-   Multinomial Naive Bayes sebagai baseline klasifikasi teks

## Integrasi tahap berikutnya

-   Telegram Bot API
-   Telegram webhook
-   REST API

**Catatan:** Jangan memasang seluruh teknologi backend dan ML sekarang.
Fokuskan dependency pada kebutuhan frontend. Jika repository sudah
menggunakan JavaScript, jangan memigrasikannya ke TypeScript secara
besar-besaran tanpa alasan yang kuat.

------------------------------------------------------------------------

# 5. Product Requirements Document (PRD)

## 5.1 Jenis pengguna

### Guest

Pengguna yang belum login. - Melihat landing page. - Melihat informasi
produk. - Membuka halaman login. - Membuka halaman register.

### Student

Pengguna mahasiswa yang sudah login. - Melihat dashboard. - Mengelola
transaksi. - Mengelola anggaran. - Mengelola target tabungan. - Melihat
laporan. - Melihat notifikasi. - Mengelola profil. - Menghubungkan
Telegram.

### Admin

Tidak menjadi fokus implementasi website hari ini. Jangan membangun
admin dashboard kecuali diminta secara eksplisit pada tahap berikutnya.

## 5.2 Prioritas fitur

-   **P0:** Wajib ada agar MVP website dapat didemonstrasikan.
-   **P1:** Penting, dapat dibuat setelah alur inti stabil.
-   **P2:** Pengembangan lanjutan.

  Fitur                         Prioritas
  ----------------------------- -----------
  Landing page                  P0
  Login dan register UI         P0
  Dashboard                     P0
  Daftar transaksi              P0
  Tambah/edit/hapus transaksi   P0
  Anggaran                      P0
  Notifikasi                    P0
  Profil                        P0
  Halaman integrasi Telegram    P0
  Laporan analitik              P1
  Target tabungan               P1
  Edukasi finansial             P2
  Admin dashboard               P2

## 5.3 Aturan bisnis dasar

### Saldo

Saldo saat ini dihitung dengan konsep:

`Saldo = Saldo Awal + Total Pemasukan - Total Pengeluaran`

Transfer internal tidak boleh dihitung sebagai pengeluaran konsumtif
atau pemasukan baru.

### Jenis transaksi

Gunakan tiga tipe: - `income` - `expense` - `transfer`

### Kategori awal

Kategori pengeluaran: - Kebutuhan Primer - Gaya Hidup - Pendidikan -
Transportasi - Kesehatan - Tagihan - Lainnya

Kategori pemasukan: - Uang Saku - Beasiswa - Gaji/Part-time - Hadiah -
Lainnya

Tabungan sebaiknya direpresentasikan sebagai target atau alokasi dana,
bukan otomatis dianggap pengeluaran konsumtif.

### Anggaran

-   Anggaran memiliki periode, misalnya bulanan.
-   Penggunaan anggaran dihitung dari transaksi expense pada kategori
    dan periode terkait.
-   Status dapat berupa Aman, Waspada, dan Melebihi Anggaran.
-   Untuk demo, ambang status dapat menggunakan 75% dan 100%, tetapi
    buat sebagai konfigurasi agar mudah diubah.

### Burn rate

Burn rate harian adalah rata-rata pengeluaran harian pada periode yang
dipilih. Tampilkan rumus atau tooltip agar pengguna memahami bahwa angka
tersebut merupakan rata-rata, bukan prediksi pasti.

### Notifikasi

Contoh: - Anggaran kategori mendekati batas. - Anggaran kategori
terlampaui. - Saldo berada di bawah batas minimum. - Target tabungan
mengalami perkembangan.

Jangan menyampaikan pesan yang menghakimi pengguna. Gunakan bahasa yang
empatik dan tidak mempermalukan.

------------------------------------------------------------------------

# 6. Sitemap dan Seluruh Halaman Website

Buat routing yang jelas dan konsisten.

## 6.1 Public pages

  Halaman           Route                Keterangan
  ----------------- -------------------- ----------------------
  Landing           `/`                  Halaman utama produk
  Login             `/login`             Form login
  Register          `/register`          Form pendaftaran
  Forgot Password   `/forgot-password`   UI reset password

## 6.2 Student pages

  -----------------------------------------------------------------------
  Halaman                 Route                   Fitur
  ----------------------- ----------------------- -----------------------
  Dashboard               `/dashboard`            Ringkasan kondisi
                                                  keuangan

  Transactions            `/transactions`         Daftar dan CRUD
                                                  transaksi

  Budgets                 `/budgets`              Anggaran dan realisasi

  Goals                   `/goals`                Target tabungan

  Reports                 `/reports`              Grafik dan laporan

  Notifications           `/notifications`        Riwayat peringatan

  Education               `/education`            Materi literasi
                                                  keuangan

  Profile                 `/settings/profile`     Informasi akun

  Telegram                `/settings/telegram`    Hubungkan Telegram

  Finance Settings        `/settings/finance`     Saldo awal dan
                                                  preferensi keuangan
  -----------------------------------------------------------------------

## 6.3 Route protection

-   Guest dapat mengakses public pages.
-   Student yang belum login tidak dapat mengakses halaman aplikasi.
-   Jika belum ada backend, gunakan mock authentication untuk
    demonstrasi.
-   Jelaskan bahwa mock authentication bukan sistem keamanan production.
-   Sediakan tombol logout.
-   Setelah logout, arahkan ke login atau landing page.

------------------------------------------------------------------------

# 7. Detail Kebutuhan Setiap Halaman

## 7.1 Landing Page --- `/`

### Tujuan

Menjelaskan manfaat SakuCampus dan mengarahkan pengunjung untuk
mendaftar.

### Struktur halaman

1.  Navbar:

    -   Logo SakuCampus.
    -   Beranda.
    -   Fitur.
    -   Cara Kerja.
    -   Tentang.
    -   Login.
    -   CTA Daftar Sekarang.

2.  Hero:

    -   Headline: **"Atur Uang Saku, Tanpa Ribet."**
    -   Subheadline: "Catat pengeluaran cukup lewat chat Telegram.
        Pantau kondisi keuangan dan bangun kebiasaan finansial yang
        lebih sehat bersama SakuCampus."
    -   CTA: "Mulai Sekarang".
    -   CTA sekunder: "Lihat Cara Kerja".
    -   Visual ilustrasi dashboard atau percakapan bot.

3.  Problem-solution:

    -   Sering lupa mencatat pengeluaran.
    -   Tidak sadar uang cepat habis.
    -   Sulit mengatur uang saku.
    -   Tampilkan bagaimana SakuCampus membantu.

4.  Fitur utama:

    -   Catat lewat Telegram.
    -   Klasifikasi transaksi otomatis.
    -   Pantau anggaran.
    -   Insight keuangan.
    -   Target tabungan.

5.  Cara kerja:

    -   Hubungkan Telegram.
    -   Kirim pesan transaksi.
    -   Sistem memahami transaksi.
    -   Pantau hasilnya di dashboard.

6.  Preview dashboard.

7.  CTA penutup.

8.  Footer:

    -   Logo.
    -   Deskripsi singkat.
    -   Navigasi.
    -   Informasi hak cipta.

### Interaksi

-   Semua CTA navigasi berfungsi.
-   Tombol daftar mengarah ke register.
-   Tombol login mengarah ke login.
-   Navbar mobile memiliki menu yang berfungsi.

## 7.2 Login --- `/login`

Komponen: - Email. - Password. - Toggle tampil/sembunyikan password. -
Remember me opsional. - Tombol login. - Link lupa password. - Link
daftar.

Validasi: - Email harus valid. - Password wajib diisi. - Tampilkan error
yang mudah dipahami. - Saat menggunakan mock auth, tampilkan keterangan
bahwa login merupakan demo.

Untuk demonstrasi lokal, boleh sediakan akun demo yang kredensialnya
ditampilkan secara jelas di UI atau README. Jangan mengklaim autentikasi
tersebut aman untuk production.

## 7.3 Register --- `/register`

Komponen: - Nama lengkap. - Email. - Password. - Konfirmasi password. -
Persetujuan syarat penggunaan. - Tombol daftar. - Link login.

Validasi: - Nama wajib diisi. - Format email valid. - Password memenuhi
aturan minimum. - Konfirmasi password harus sama. - Checkbox persetujuan
harus dipilih.

Setelah pendaftaran demo berhasil, arahkan ke dashboard atau halaman
onboarding sederhana.

## 7.4 Dashboard --- `/dashboard`

Ini adalah halaman terpenting.

### Header

-   Sapaan berdasarkan nama pengguna.
-   Tanggal atau periode.
-   Notifikasi.
-   Avatar/profil.

### Summary cards

-   Total saldo.
-   Total pemasukan periode ini.
-   Total pengeluaran periode ini.
-   Rata-rata burn rate harian.

### Grafik

-   Grafik pemasukan vs pengeluaran.
-   Filter periode: 7 hari, 30 hari, bulan ini.
-   Grafik kategori pengeluaran.

### Financial insight

Contoh: - "Pengeluaran transportasimu meningkat dibanding periode
sebelumnya." - "Anggaran gaya hidup sudah terpakai 80%." - "Kamu
berhasil menyisihkan Rp150.000 bulan ini."

Semua insight demo harus dihitung dari mock data atau ditandai sebagai
contoh. Jangan membuat AI palsu.

### Budget overview

-   Nama kategori.
-   Jumlah terpakai.
-   Batas anggaran.
-   Progress bar.
-   Status.

### Recent transactions

-   Deskripsi.
-   Tanggal.
-   Kategori.
-   Nominal.
-   Jenis transaksi.
-   Tombol lihat semua.

### Empty state

Jika belum ada transaksi, tampilkan pesan: "Belum ada transaksi. Mulai
catat pengeluaran pertamamu melalui Telegram atau website."

## 7.5 Transactions --- `/transactions`

### Fitur

-   Tabel atau list transaksi.
-   Pencarian berdasarkan deskripsi.
-   Filter tanggal.
-   Filter kategori.
-   Filter tipe transaksi.
-   Sorting tanggal dan nominal.
-   Pagination jika data banyak.
-   Tambah transaksi.
-   Edit transaksi.
-   Hapus transaksi dengan dialog konfirmasi.
-   Detail transaksi.

### Form transaksi

Field: - Deskripsi. - Nominal. - Jenis transaksi. - Kategori. -
Tanggal. - Sumber transaksi (website/Telegram).

Validasi: - Nominal harus lebih besar dari nol. - Deskripsi wajib. -
Tanggal valid. - Kategori sesuai jenis transaksi.

### Interaksi

-   Tambah transaksi memperbarui tabel dan ringkasan.
-   Edit memperbarui data.
-   Hapus memperbarui saldo dan grafik.
-   Filter benar-benar memfilter data.
-   Sediakan toast sukses/error.

## 7.6 Budgets --- `/budgets`

### Fitur

-   Ringkasan total anggaran.
-   Total terpakai.
-   Sisa anggaran.
-   Daftar anggaran per kategori.
-   Progress bar.
-   Status Aman/Waspada/Melebihi.
-   Tambah anggaran.
-   Edit anggaran.
-   Hapus anggaran.
-   Pilih periode.

### Form

-   Kategori.
-   Batas nominal.
-   Periode mulai.
-   Periode selesai.

Gunakan dialog/modal yang konsisten dengan halaman transaksi.

## 7.7 Goals --- `/goals`

### Fitur

-   Daftar target tabungan.
-   Nama target.
-   Nominal target.
-   Nominal terkumpul.
-   Deadline.
-   Progress.
-   Tambah target.
-   Edit target.
-   Tambah kontribusi.
-   Hapus target.

Contoh target: - Dana darurat. - Laptop. - Biaya kuliah. - Tabungan
liburan.

Jangan membuat fitur investasi atau transaksi keuangan eksternal.

## 7.8 Reports --- `/reports`

### Fitur

-   Filter periode.
-   Total pemasukan.
-   Total pengeluaran.
-   Net cash flow.
-   Grafik tren.
-   Distribusi kategori.
-   Rata-rata pengeluaran.
-   Perbandingan periode.
-   Ekspor CSV sederhana jika mudah dan stabil.

Semua visualisasi harus berdasarkan data yang sama dengan halaman
transaksi.

## 7.9 Notifications --- `/notifications`

### Fitur

-   Daftar notifikasi.
-   Filter semua/belum dibaca.
-   Kategori peringatan.
-   Tanggal.
-   Tandai sudah dibaca.
-   Tandai semua sudah dibaca.
-   Hapus notifikasi.
-   Klik notifikasi menuju halaman terkait jika memungkinkan.

Gunakan bahasa empatik: - "Pengeluaran gaya hidupmu sudah mendekati
batas anggaran." - "Saldo kamu mulai menipis. Coba periksa pengeluaran
beberapa hari terakhir." - "Bagus! Target tabunganmu sudah mencapai
60%."

## 7.10 Education --- `/education`

### Fitur

-   Kumpulan artikel atau kartu materi.
-   Kategori edukasi.
-   Detail artikel.
-   Materi dana darurat.
-   Materi budgeting.
-   Mengelola uang saku.
-   Membedakan kebutuhan dan keinginan.

Konten boleh berupa contoh statis pada tahap website awal.

## 7.11 Profile --- `/settings/profile`

### Fitur

-   Nama.
-   Email.
-   Foto/avatar opsional.
-   Edit nama.
-   Ubah password (UI demo jika backend belum ada).
-   Logout.

## 7.12 Telegram Integration --- `/settings/telegram`

### Kondisi belum terhubung

-   Ilustrasi Telegram.
-   Status "Belum terhubung".
-   Penjelasan manfaat.
-   Tombol "Hubungkan Telegram".
-   Langkah aktivasi.

### Kondisi simulasi terhubung

-   Status "Terhubung".
-   Username Telegram contoh.
-   Tanggal koneksi contoh.
-   Tombol putuskan koneksi.

### Perilaku demo

-   Tombol hubungkan menjalankan simulasi.
-   Berikan keterangan "Simulasi --- integrasi Telegram belum aktif".
-   Jangan membuka link bot fiktif atau mengklaim Telegram sungguhan
    terhubung.
-   Struktur komponen harus siap menerima `telegramStatus` dari API
    nantinya.

## 7.13 Finance Settings --- `/settings/finance`

### Fitur

-   Saldo awal.
-   Batas saldo minimum.
-   Periode keuangan.
-   Preferensi mata uang (IDR untuk MVP).
-   Preferensi notifikasi.
-   Simpan pengaturan.

------------------------------------------------------------------------

# 8. Design System dan UI/UX

## 8.1 Brand personality

SakuCampus harus terasa: - Friendly. - Modern. - Terpercaya. -
Sederhana. - Edukatif. - Tidak menghakimi kondisi finansial pengguna.

Hindari tampilan yang terlalu mirip aplikasi perbankan korporat. Target
utama adalah mahasiswa.

## 8.2 Warna

Gunakan palet UIN Jakarta berikut (biru `#336799` dengan aksen emas
`#F4B400`):

  Token            Hex         Penggunaan
  ---------------- ----------- ----------------------------
  Primary          `#336799`   CTA dan elemen utama
  Primary Dark     `#1D4B76`   Hover dan heading tertentu
  Primary Light    `#E7F4F6`   Background highlight
  Gold             `#F4B400`   Aksen dekoratif dan highlight
  Gold Dark        `#8F6300`   Teks peringatan
  Background       `#F6F9FB`   Background aplikasi
  Surface          `#FFFFFF`   Card dan panel
  Text Primary     `#112958`   Teks utama
  Text Secondary   `#54647B`   Teks sekunder
  Border           `#DFE9EB`   Border
  Success          `#0A7A47`   Status sukses
  Warning          `#8F6300`   Status peringatan
  Danger           `#B84A43`   Status kritis
  Info             `#2F6FA8`   Informasi

Gunakan warna secara konsisten melalui design tokens/CSS variables,
bukan menuliskan hex secara acak di semua komponen.

## 8.3 Typography

Prioritas: - Plus Jakarta Sans atau Inter. - Heading jelas. - Body text
nyaman dibaca. - Angka saldo menggunakan font weight kuat dan ukuran
yang cukup besar. - Hindari terlalu banyak ukuran font.

## 8.4 Layout dashboard

Desktop: - Sidebar kiri sekitar 240--260 px. - Header/topbar. - Main
content fleksibel. - Konten memiliki max width yang wajar. - Grid cards
responsif.

Mobile: - Sidebar berubah menjadi drawer atau bottom navigation. - Tabel
berubah menjadi card/list bila perlu. - Form menjadi satu kolom. -
Tombol mudah disentuh. - Tidak ada horizontal overflow.

## 8.5 Komponen reusable

Buat komponen: - `AppSidebar` - `AppHeader` - `MobileNavigation` -
`PageHeader` - `StatCard` - `ChartCard` - `BudgetProgress` -
`TransactionTable` - `TransactionForm` - `NotificationItem` -
`EmptyState` - `LoadingState` - `ErrorState` - `ConfirmDialog` -
`Modal` - `Badge` - `Button` - `Input` - `Select` - `Toast`

Jangan membuat komponen generik yang terlalu kompleks. Abstraksi harus
membantu konsistensi, bukan mempersulit.

## 8.6 Visual guidance

Gunakan: - Whitespace yang cukup. - Card dengan border halus. - Shadow
sangat ringan jika diperlukan. - Radius konsisten. - Ikon Lucide. -
Grafik dengan label dan tooltip. - Animasi kecil dan tidak berlebihan. -
Kontras warna yang baik.

Hindari: - Gradient berlebihan. - Glassmorphism berlebihan. - Terlalu
banyak warna. - Terlalu banyak card kecil. - Font terlalu kecil. - Emoji
sebagai pengganti semua ikon. - Tombol tanpa fungsi.

------------------------------------------------------------------------

# 9. Arsitektur Frontend

Gunakan struktur berbasis fitur (feature-based) agar mudah dirawat.

Contoh:

``` text
frontend/
├── public/
│   ├── icons/
│   └── manifest.json
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── charts/
│   │   └── feedback/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── education/
│   │   ├── profile/
│   │   └── telegram/
│   │
│   ├── layouts/
│   │   ├── PublicLayout.tsx
│   │   └── AppLayout.tsx
│   │
│   ├── services/
│   │   ├── api-client.ts
│   │   ├── auth.service.ts
│   │   ├── transaction.service.ts
│   │   ├── budget.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── mocks/
│   │   ├── users.ts
│   │   ├── transactions.ts
│   │   ├── budgets.ts
│   │   ├── goals.ts
│   │   └── notifications.ts
│   │
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── main.tsx
│
├── package.json
└── vite.config.ts
```

Sesuaikan struktur ini dengan kebutuhan dan konvensi framework yang
benar-benar digunakan.

## Prinsip arsitektur

1.  Page hanya bertugas menyusun komponen halaman.
2.  Komponen UI tidak boleh berisi seluruh business logic.
3.  Data diambil melalui service.
4.  Mock service memiliki interface yang mirip dengan API service.
5.  Tipe data diletakkan di folder types atau dekat feature terkait.
6.  Format mata uang dan tanggal menggunakan utility terpusat.
7.  Komponen yang digunakan lintas fitur ditempatkan di `components`.
8.  Hindari satu file komponen yang terlalu besar.

------------------------------------------------------------------------

# 10. Mock Data dan Konsistensi Perhitungan

Buat dataset demo yang realistis dan konsisten.

## 10.1 Contoh user

``` json
{
  "id": "user-demo-001",
  "name": "Andi Pratama",
  "email": "andi@example.com",
  "currency": "IDR",
  "initial_balance": 1000000
}
```

## 10.2 Contoh transaksi

``` json
[
  {
    "id": "trx-001",
    "description": "Uang saku bulanan",
    "amount": 2500000,
    "type": "income",
    "category": "Uang Saku",
    "date": "2026-10-01",
    "source": "manual"
  },
  {
    "id": "trx-002",
    "description": "Makan ayam geprek",
    "amount": 20000,
    "type": "expense",
    "category": "Kebutuhan Primer",
    "date": "2026-10-02",
    "source": "telegram"
  },
  {
    "id": "trx-003",
    "description": "Kopi",
    "amount": 15000,
    "type": "expense",
    "category": "Gaya Hidup",
    "date": "2026-10-02",
    "source": "telegram"
  }
]
```

## 10.3 Aturan konsistensi

-   Gunakan satu sumber data transaksi untuk dashboard, laporan, dan
    halaman transaksi.
-   Saldo dihitung dari initial balance dan transaksi.
-   Total pemasukan dan pengeluaran dihitung berdasarkan filter periode.
-   Budget usage dihitung dari transaksi expense.
-   Chart tidak boleh menggunakan angka yang berbeda dari tabel
    transaksi.
-   Setelah transaksi ditambah, diedit, atau dihapus, semua ringkasan
    terkait harus diperbarui.
-   Gunakan data tanggal yang konsisten dengan periode demo.
-   Jangan mencampur data dari tahun atau bulan berbeda tanpa
    penjelasan.

## 10.4 Format mata uang

Gunakan format Indonesia:

`Rp1.250.000`

Gunakan utility terpusat seperti
`Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.

------------------------------------------------------------------------

# 11. Arsitektur Integrasi Masa Depan

Walaupun backend belum dikerjakan hari ini, frontend harus disiapkan
agar tidak perlu dibongkar ulang.

## 11.1 Target arsitektur

``` text
                 STUDENT
                    |
          +---------+---------+
          |                   |
      Telegram Bot        PWA Website
          |                   |
       Webhook             REST API
          |                   |
          +---------+---------+
                    |
                FastAPI
                    |
       +------------+------------+
       |            |            |
   Transaction     NLP       Rule Engine
     Service      Module        |
       |            |            |
       +------------+------------+
                    |
                PostgreSQL
                    |
             Analytics Service
                    |
              Dashboard API
```

## 11.2 Prinsip integrasi frontend

Buat API client dengan base URL melalui environment variable.

Contoh:

``` env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Jangan hardcode URL API di setiap komponen.

Service dapat dimulai dengan mock implementation. Nantinya implementasi
dapat diganti ke HTTP API dengan interface dan return type yang sama.

Contoh kontrak: - `getTransactions()` - `createTransaction(payload)` -
`updateTransaction(id, payload)` - `deleteTransaction(id)` -
`getDashboardSummary(period)` - `getBudgets()` - `getNotifications()` -
`getTelegramStatus()` - `createTelegramLinkToken()`

## 11.3 Telegram linking di masa depan

Alur target: 1. User login ke website. 2. User membuka pengaturan
Telegram. 3. Frontend meminta link token ke FastAPI. 4. Backend
menghasilkan token acak sekali pakai dan kedaluwarsa. 5. Frontend
membuka deep link `https://t.me/<bot_username>?start=<token>`. 6. User
menekan Start. 7. Telegram mengirim update ke webhook. 8. Backend
memvalidasi token dan Telegram user ID. 9. Backend menghubungkan
Telegram ID dengan user ID. 10. Website memperbarui status koneksi.

Jangan menggunakan username Telegram sebagai identitas utama. Gunakan
Telegram user ID. Token harus acak, sekali pakai, memiliki masa berlaku,
dan disimpan secara aman dalam bentuk hash.

------------------------------------------------------------------------

# 12. Struktur Backend yang Direncanakan

Bagian ini adalah referensi tahap berikutnya, bukan instruksi untuk
membangun backend hari ini.

``` text
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/
│   │   └── v1/
│   ├── core/
│   ├── database/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── modules/
│   │   ├── telegram/
│   │   ├── nlp/
│   │   ├── rule_engine/
│   │   └── analytics/
│   └── utils/
│
├── ml/
│   ├── datasets/
│   ├── notebooks/
│   ├── training/
│   └── artifacts/
│
├── migrations/
├── tests/
└── requirements.txt
```

------------------------------------------------------------------------

# 13. Kontrak API Awal

Gunakan prefix `/api/v1`.

  Method   Endpoint                     Kegunaan
  -------- ---------------------------- ----------------------
  POST     `/auth/register`             Registrasi
  POST     `/auth/login`                Login
  POST     `/auth/logout`               Logout
  GET      `/auth/me`                   Profil aktif
  GET      `/analytics/summary`         Ringkasan dashboard
  GET      `/analytics/expenses`        Analisis pengeluaran
  GET      `/analytics/trends`          Tren
  GET      `/transactions`              Daftar transaksi
  POST     `/transactions`              Tambah transaksi
  GET      `/transactions/{id}`         Detail transaksi
  PATCH    `/transactions/{id}`         Edit transaksi
  DELETE   `/transactions/{id}`         Hapus transaksi
  GET      `/budgets`                   Daftar anggaran
  POST     `/budgets`                   Tambah anggaran
  PATCH    `/budgets/{id}`              Edit anggaran
  GET      `/goals`                     Daftar target
  POST     `/goals`                     Tambah target
  GET      `/notifications`             Daftar notifikasi
  PATCH    `/notifications/{id}/read`   Tandai dibaca
  GET      `/telegram/status`           Status Telegram
  POST     `/telegram/link-token`       Buat token linking
  DELETE   `/telegram/unlink`           Putuskan Telegram
  POST     `/telegram/webhook`          Webhook Telegram

Frontend tidak perlu memanggil endpoint yang belum tersedia. Gunakan
mock service.

------------------------------------------------------------------------

# 14. Accessibility, Security, dan UX Quality

## Accessibility

-   Gunakan semantic HTML.
-   Setiap input memiliki label.
-   Tombol memiliki nama yang jelas.
-   Navigasi keyboard dapat digunakan.
-   Fokus keyboard terlihat.
-   Kontras teks cukup.
-   Jangan hanya menggunakan warna untuk membedakan status.

## Security

-   Jangan menyimpan password asli dalam mock data.
-   Jangan memasukkan secret ke repository.
-   Jangan menyatakan mock login sebagai autentikasi production.
-   Validasi input.
-   Hindari menampilkan data pribadi yang tidak diperlukan.
-   Backend nantinya wajib menerapkan otorisasi per pengguna.

## UX

-   Semua form memiliki loading, success, dan error state.
-   Semua halaman memiliki empty state.
-   Gunakan skeleton atau loading state jika diperlukan.
-   Dialog hapus harus meminta konfirmasi.
-   Filter dan pencarian harus berfungsi.
-   Pesan error harus membantu pengguna menyelesaikan masalah.
-   Hindari istilah teknis seperti NLP atau Rule Engine pada antarmuka
    mahasiswa.

------------------------------------------------------------------------

# 15. Checklist Penerimaan Website

Website dianggap selesai untuk target hari ini jika checklist berikut
terpenuhi.

## Foundation

-   [ ] Project dapat dijalankan secara lokal.
-   [ ] Struktur folder jelas.
-   [ ] Routing berfungsi.
-   [ ] Design tokens konsisten.
-   [ ] Tidak ada error build.

## Public pages

-   [ ] Landing page selesai.
-   [ ] Login selesai.
-   [ ] Register selesai.
-   [ ] Forgot password memiliki UI yang layak.
-   [ ] CTA dan navigasi berfungsi.

## Student application

-   [ ] Dashboard selesai.
-   [ ] Transactions selesai.
-   [ ] CRUD transaksi demo berfungsi.
-   [ ] Budgets selesai.
-   [ ] Goals selesai atau memiliki versi dasar.
-   [ ] Reports selesai atau memiliki versi dasar.
-   [ ] Notifications berfungsi.
-   [ ] Profile selesai.
-   [ ] Telegram settings selesai.
-   [ ] Finance settings selesai.

## Data dan interaksi

-   [ ] Mock data terpusat.
-   [ ] Perhitungan saldo konsisten.
-   [ ] Grafik menggunakan data yang benar.
-   [ ] Form memiliki validasi.
-   [ ] Filter berfungsi.
-   [ ] Modal berfungsi.
-   [ ] Toast berfungsi.
-   [ ] Tidak ada tombol mati.

## Responsive

-   [ ] Desktop nyaman digunakan.
-   [ ] Tablet nyaman digunakan.
-   [ ] Mobile tidak memiliki horizontal overflow.
-   [ ] Navigasi mobile berfungsi.
-   [ ] Form mudah digunakan di layar kecil.

## Quality

-   [ ] Lint berhasil jika tersedia.
-   [ ] Typecheck berhasil jika tersedia.
-   [ ] Build berhasil.
-   [ ] Tidak ada error console yang diketahui.
-   [ ] README memiliki instruksi menjalankan project.
-   [ ] Semua integrasi yang belum ada diberi label simulasi.

------------------------------------------------------------------------

# 16. Instruksi Eksekusi Bertahap untuk OpenCode

Gunakan urutan berikut. Jangan melompati audit dan fondasi.

## TASK 0 --- Audit repository

Instruksi: - Periksa struktur repository. - Identifikasi framework dan
dependency. - Periksa apakah ada kode yang dapat digunakan kembali. -
Periksa script package manager. - Laporkan kondisi awal dan rencana
implementasi.

Output yang diharapkan: - Ringkasan kondisi repository. - Rencana file
yang akan dibuat/diubah. - Potensi masalah teknis.

## TASK 1 --- Setup foundation

Instruksi: - Siapkan React + Vite + TypeScript jika belum tersedia. -
Siapkan Tailwind CSS sesuai versi yang kompatibel. - Siapkan React
Router. - Siapkan Lucide React. - Siapkan Recharts. - Buat struktur
folder. - Buat global styles dan design tokens. - Buat komponen UI
dasar. - Pastikan aplikasi dapat dijalankan.

Acceptance: - Aplikasi berjalan. - Tidak ada error build. - Warna,
typography, dan spacing konsisten.

## TASK 2 --- Layout dan routing

Instruksi: - Buat PublicLayout. - Buat AppLayout. - Buat sidebar
desktop. - Buat navigasi mobile. - Buat header. - Buat route protection
demo. - Buat halaman placeholder yang rapi untuk semua route.

Acceptance: - Semua route dapat dibuka. - Sidebar aktif sesuai
halaman. - Navigasi mobile berfungsi. - Logout demo berfungsi.

## TASK 3 --- Public pages

Instruksi: - Bangun landing page. - Bangun login. - Bangun register. -
Bangun forgot password. - Terapkan validasi form. - Terapkan mock
authentication. - Buat akun demo untuk presentasi.

Acceptance: - CTA berfungsi. - Validasi bekerja. - Login demo dapat
masuk dashboard. - Logout mengembalikan pengguna ke halaman publik.

## TASK 4 --- Dashboard

Instruksi: - Buat summary cards. - Buat grafik pemasukan dan
pengeluaran. - Buat distribusi kategori. - Buat budget overview. - Buat
financial insight. - Buat transaksi terbaru. - Tambahkan filter periode.

Acceptance: - Angka berasal dari mock data. - Perhitungan konsisten. -
Grafik responsif. - Empty state tersedia.

## TASK 5 --- Transactions dan Budgets

Instruksi: - Buat tabel/list transaksi. - Buat filter dan pencarian. -
Buat form tambah/edit. - Buat dialog hapus. - Buat halaman anggaran. -
Buat progress dan status anggaran. - Pastikan perubahan data memengaruhi
ringkasan dashboard.

Acceptance: - CRUD demo bekerja. - Filter bekerja. - Perhitungan saldo
dan anggaran diperbarui.

## TASK 6 --- Goals, Reports, Notifications, Settings

Instruksi: - Buat target tabungan. - Buat laporan. - Buat notifikasi. -
Buat profile. - Buat Telegram integration UI. - Buat finance settings. -
Gunakan komponen dan design tokens yang sudah tersedia.

Acceptance: - Semua halaman memiliki tampilan konsisten. - Interaksi
utama bekerja. - Telegram ditandai sebagai simulasi.

## TASK 7 --- Responsive dan QA

Instruksi: - Periksa seluruh halaman pada desktop, tablet, dan mobile. -
Perbaiki overflow. - Periksa form dan modal. - Periksa seluruh tombol
dan link. - Jalankan lint, typecheck, test, dan build. - Perbaiki semua
error yang ditemukan. - Perbarui README.

Acceptance: - Build berhasil. - Semua route berfungsi. - Tidak ada
kontrol utama yang mati. - Website siap didemonstrasikan.

------------------------------------------------------------------------

# 17. Definition of Done

Website SakuCampus tahap pertama dianggap selesai apabila:

1.  Pengunjung dapat melihat landing page.
2.  Pengunjung dapat melakukan simulasi register dan login.
3.  Pengguna demo dapat masuk ke dashboard.
4.  Pengguna dapat melihat ringkasan keuangan.
5.  Pengguna dapat menambah, mengedit, dan menghapus transaksi demo.
6.  Perubahan transaksi tercermin pada saldo dan grafik.
7.  Pengguna dapat melihat dan mengelola anggaran demo.
8.  Pengguna dapat melihat notifikasi.
9.  Pengguna dapat membuka halaman pengaturan Telegram.
10. Semua halaman utama responsive.
11. Aplikasi dapat dijalankan dari instruksi README.
12. Build berhasil tanpa error.

------------------------------------------------------------------------

# 18. Prompt Pembuka untuk OpenCode

Setelah menempatkan dokumen ini di root repository dengan nama
`SAKUCAMPUS_MASTER_SPEC.md`, berikan instruksi berikut kepada OpenCode:

> Baca seluruh file `SAKUCAMPUS_MASTER_SPEC.md` sampai selesai dan
> jadikan dokumen tersebut sebagai spesifikasi utama proyek SakuCampus.
>
> Hari ini fokus kita hanya membangun website frontend. Jangan
> implementasikan Telegram API, FastAPI, PostgreSQL, NLP, atau Rule
> Engine production.
>
> Mulai dengan TASK 0: audit repository dan laporkan kondisi awal.
> Setelah itu lanjutkan secara berurutan dari TASK 1 sampai TASK 7.
>
> Jangan hanya memberikan contoh kode atau tutorial. Implementasikan
> langsung pada repository yang tersedia.
>
> Pertahankan kode yang sudah relevan. Gunakan mock data dan mock
> service yang terstruktur untuk fitur yang belum memiliki backend.
>
> Prioritaskan kualitas UI/UX, konsistensi data, responsive design,
> struktur kode yang rapi, dan interaksi yang benar-benar berfungsi.
>
> Setelah setiap task, jalankan pemeriksaan yang tersedia dan perbaiki
> error sebelum melanjutkan. Jangan mengklaim fitur selesai jika belum
> diuji.
>
> Jika seluruh implementasi selesai, berikan ringkasan hasil, daftar
> fitur yang sudah berfungsi, daftar mock integration, cara menjalankan
> aplikasi, dan pekerjaan tersisa.

------------------------------------------------------------------------

# 19. Catatan Pengembangan untuk Tahap Berikutnya

Setelah website selesai, urutan pengembangan yang disarankan:

1.  Finalisasi ERD dan database PostgreSQL.
2.  Implementasi FastAPI dan autentikasi.
3.  Implementasi API transaksi, anggaran, dan dashboard.
4.  Integrasi frontend dengan backend.
5.  Pembuatan Telegram Bot dan webhook.
6.  Aktivasi akun melalui deep link dan one-time token.
7.  Pembuatan dataset transaksi mahasiswa.
8.  Training dan evaluasi model NLP.
9.  Implementasi Rule Engine.
10. Integrasi notifikasi Telegram.
11. Integration testing dan user acceptance testing.

**Prinsip akhir:** Bangun produk yang sederhana tetapi benar-benar
bekerja. Jangan mengejar banyak fitur sebelum alur inti SakuCampus
terbukti berjalan dengan baik.
