# Checklist UAT SakuCampus

Checklist ini dipakai untuk acceptance manual. Skenario otomatis menjadi pengaman regresi; checklist manual tetap harus diisi oleh penguji.

## Prasyarat

- Backend dan frontend berjalan dalam mode HTTP (`VITE_USE_MOCK_API=false`).
- Database lokal memiliki schema `sakucampus_test`; jangan pakai database produksi.
- Akun uji dibuat baru atau memakai akun demo yang sudah di-seed.
- `TELEGRAM_MODE=simulation` untuk UAT tanpa kredensial bot sungguhan.
- Untuk mengisi hasil, gunakan `UAT_RESULTS.md`.

## Penilaian

| Nilai | Arti |
| --- | --- |
| Lulus | Sesuai ekspektasi tanpa error dan tanpa perubahan data yang tidak diharapkan. |
| Gagal | Ada error, data salah, atau alur tidak selesai. |
| Terkunci | Menunggu kredensial/layanan eksternal; sertakan alasan. |
| N/A | Tidak relevan untuk rilis ini. |

## Checklist

| ID | Area | Langkah manual | Ekspektasi | Otomatis |
| --- | --- | --- | --- | --- |
| UAT-01 | Auth + transaksi | Daftar akun baru, tambah transaksi pengeluaran, buka dashboard, logout. | Sesi terbentuk, transaksi muncul, dashboard menampilkan ringkasan `Tersinkron`, logout mengarah ke `/login`. | `auth-transactions.spec.ts` |
| UAT-02 | Anggaran + goals | Buat anggaran, buat target tabungan, tambah kontribusi, buka notifikasi, buka halaman Telegram dan klik hubungkan. | Anggaran/target tersimpan, kontribusi menambah dana, notifikasi termuat, mode simulasi menampilkan pesan bot belum dikonfigurasi. | `budgets-goals-telegram.spec.ts` |
| UAT-03 | Profil + keamanan | Ubah password, logout, coba buka `/transactions`, login dengan password baru. | Halaman terproteksi menolak akses tanpa sesi; login password baru berhasil; password lama ditolak. | `profile-security.spec.ts` |
| UAT-04 | Transaksi lanjutan | Edit dan hapus transaksi dari halaman transaksi. | Perubahan tersimpan dan daftar/ringkasan diperbarui. | Manual |
| UAT-05 | Anggaran lanjutan | Edit anggaran, coba buat dua anggaran dengan periode identik, hapus anggaran. | Edit/hapus berhasil; konflik periode ditolak dengan pesan jelas. | Manual |
| UAT-06 | Laporan | Buka halaman laporan dan ubah periode. | Grafik/ringkasan berubah sesuai periode dan konsisten dengan dashboard. | Manual |
| UAT-07 | Notifikasi | Tandai satu notifikasi dibaca, tandai semua dibaca, hapus satu notifikasi. | Status berubah persisten setelah halaman dimuat ulang. | Manual |
| UAT-08 | Rule engine | Buat transaksi yang memicu peringatan anggaran/saldo/target. | Notifikasi otomatis muncul tanpa duplikat untuk rule key yang sama. | Manual |
| UAT-09 | Responsif | Uji alur UAT-01 sampai UAT-03 pada viewport desktop dan mobile. | Navigasi, form, dan konfirmasi tetap dapat digunakan. | Manual |
| UAT-10 | Telegram sungguhan | Isi kredensial bot, daftarkan webhook, uji deep link dan kirim chat `makan ayam 20rb`. | Linking berhasil, balasan bot diterima, transaksi tersimpan sekali walau webhook di-retry. | Terkunci tanpa kredensial |
| UAT-11 | Observability | Periksa `/health/live`, `/health/ready`, dan satu request gagal. | Health merespons; log JSON memiliki `request_id`; error tidak membocorkan secret. | Manual |
| UAT-12 | Keamanan | Uji Origin/Referer tidak dikenal pada request mutasi dan kirim Bearer palsu bersama cookie valid. | Request ditolak; cookie sesi dipakai hanya dengan CSRF/Origin valid. | Manual |

## Catatan pengujian

- Selalu reset data UAT sebelum sesi baru agar hasil tidak dipengaruhi data lama.
- Jangan masukkan password database, JWT secret, atau token Telegram ke `UAT_RESULTS.md`.
- Lampirkan screenshot hanya jika berisi data uji bukan data produksi.
