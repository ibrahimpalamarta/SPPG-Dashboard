import type { Prisma } from '@prisma/client';

/**
 * SCRUM-20/123: seeds the Kamus Data / Aturan Cek Data / Daftar Kode tabs on
 * Data Reference so they read the same the first time an environment comes
 * up as they did as static frontend text — PM MBG edits them from there on
 * through PATCH /api/reference-entries/:id (reference:edit).
 */

const KAMUS: { nama: string; artinya: string; contoh: string; wajib: string; aturan: string; kerahasiaan: string }[] = [
  { nama: 'Kode upload', artinya: 'Kode unik untuk setiap file yang diunggah', contoh: 'UPL-SKN-20261008-001', wajib: 'Ya', aturan: 'Dibuat otomatis oleh sistem', kerahasiaan: 'Internal' },
  { nama: 'Nomor baris sumber', artinya: 'Penanda baris asal di file', contoh: 'SRC-SKN-CF-000001', wajib: 'Ya', aturan: 'Unik per file', kerahasiaan: 'Internal' },
  { nama: 'Kode dapur', artinya: 'Dapur pemilik data', contoh: 'SKN', wajib: 'Ya', aturan: 'Diambil dari pilihan saat unggah', kerahasiaan: 'Internal' },
  { nama: 'Asal data', artinya: 'Sistem atau file asal data', contoh: 'Input Maker', wajib: 'Ya', aturan: 'Dari daftar tetap', kerahasiaan: 'Internal' },
  { nama: 'Nama file', artinya: 'Nama file asli yang diunggah', contoh: '[SKN] CASHFLOW SUKUN.xlsx', wajib: 'Ya', aturan: 'Disimpan apa adanya', kerahasiaan: 'Internal' },
  { nama: 'Versi format', artinya: 'Versi format file yang dipakai', contoh: 'v1.0', wajib: 'Ya', aturan: 'Setiap perubahan format membuat versi baru', kerahasiaan: 'Internal' },
  { nama: 'Format file', artinya: 'Aturan membaca kolom file per dapur', contoh: 'MAP-SKN-CF-001', wajib: 'Ya', aturan: 'Lihat tab Format File', kerahasiaan: 'Internal' },
  { nama: 'Waktu masuk', artinya: 'Kapan data masuk ke sistem', contoh: '08 Okt 2026 10:30', wajib: 'Ya', aturan: 'Dicatat otomatis', kerahasiaan: 'Internal' },
  { nama: 'Nomor baris', artinya: 'Nomor urut baris di file', contoh: '1', wajib: 'Ya', aturan: 'Jika kosong, diisi nomor urut', kerahasiaan: 'Internal' },
  { nama: 'Nomor transaksi', artinya: 'Nomor satu transaksi (bisa beberapa baris barang)', contoh: 'TXN-B0004', wajib: 'Ya', aturan: 'Unik per dapur', kerahasiaan: 'Internal' },
  { nama: 'Tanggal transaksi', artinya: 'Tanggal uang keluar/masuk', contoh: '22 Feb 2026', wajib: 'Ya', aturan: 'Format tanggal dirapikan', kerahasiaan: 'Internal' },
  { nama: 'Jenis transaksi', artinya: 'Belanja, insentif, gaji, penerimaan, dll.', contoh: 'BELANJA', wajib: 'Ya', aturan: 'Dari daftar tetap', kerahasiaan: 'Internal' },
  { nama: 'Uang masuk / keluar', artinya: 'Arah uang', contoh: 'KELUAR', wajib: 'Ya', aturan: 'MASUK atau KELUAR', kerahasiaan: 'Internal' },
  { nama: 'Kategori', artinya: 'Kelompok pengeluaran', contoh: 'Bahan Baku', wajib: 'Ya', aturan: 'Disamakan dengan daftar kategori', kerahasiaan: 'Internal' },
  { nama: 'Nama supplier (asli)', artinya: 'Nama penerima uang seperti tertulis di file', contoh: 'Bedjo Untung', wajib: 'Ya', aturan: 'Disimpan apa adanya', kerahasiaan: 'Internal' },
  { nama: 'Harga satuan', artinya: 'Harga per satuan barang', contoh: '65000', wajib: 'Kadang', aturan: 'Penulisan Rupiah dirapikan', kerahasiaan: 'Internal' },
  { nama: 'Harga per baris', artinya: 'Harga satu baris barang', contoh: '1885000', wajib: 'Kadang', aturan: '≈ jumlah × harga satuan', kerahasiaan: 'Internal' },
  { nama: 'Total transaksi', artinya: 'Total satu transaksi', contoh: '1885000', wajib: 'Ya', aturan: 'Dihitung sekali, bukan per baris', kerahasiaan: 'Internal' },
  { nama: 'Status konfirmasi', artinya: 'Apakah baris sudah dikonfirmasi dapur', contoh: 'TERKONFIRMASI', wajib: 'Ya', aturan: 'Hanya Terkonfirmasi yang dihitung', kerahasiaan: 'Internal' },
  { nama: 'Supplier', artinya: 'Supplier setelah nama digabung', contoh: 'Toko Nasya', wajib: 'Tidak', aturan: 'Nama asli tetap disimpan', kerahasiaan: 'Internal' },
  { nama: 'Porsi rencana', artinya: 'Jumlah porsi yang direncanakan', contoh: '1661', wajib: 'Ya', aturan: 'Per segmen; beda dengan porsi aktual', kerahasiaan: 'Internal' },
  { nama: 'Saldo rekening', artinya: 'Saldo akhir hari', contoh: '186420500', wajib: 'Ya', aturan: 'Sumber resmi belum diputuskan (OD-02)', kerahasiaan: 'Internal' },
  { nama: 'Jumlah penerima', artinya: 'Rencana dan aktual penerima per hari', contoh: '2348 / belum ada', wajib: 'Ya', aturan: 'Rencana & aktual dipisah; kosong ≠ 0', kerahasiaan: 'Internal (total saja)' },
  { nama: 'Segmen porsi', artinya: 'Kelompok porsi', contoh: 'Kecil', wajib: 'Ya', aturan: 'Kecil, Besar, Balita, Bumil & Busui', kerahasiaan: 'Internal' },
  { nama: 'Data pribadi penerima', artinya: 'NIK, nama, telepon, alamat', contoh: '(dirahasiakan)', wajib: 'Tidak', aturan: 'Tidak tampil di dashboard', kerahasiaan: 'Rahasia' },
];

// tingkatTone matches the Badge `tone` prop (components/ui/badge.tsx) the frontend already uses.
const ATURAN: { cek: string; aturan: string; tingkat: string; tingkatTone: string; akibat: string }[] = [
  { cek: 'Semua data', aturan: 'Kode dapur, kode upload, dan nomor baris harus ada', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Ditolak' },
  { cek: 'Tanggal', aturan: 'Tanggal dirapikan; tanggal yang tidak mungkin ditolak', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Ditolak / dicek' },
  { cek: 'Rupiah', aturan: 'Angka Rupiah dirapikan (Rp, spasi, titik dihapus)', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Dirapikan' },
  { cek: 'Total transaksi', aturan: 'Total dihitung sekali per transaksi, bukan per baris barang', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Angka ditahan' },
  { cek: 'Harga baris', aturan: 'Harga baris kira-kira = jumlah × harga satuan', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Diberi tanda' },
  { cek: 'Status konfirmasi', aturan: 'Hanya baris “TERKONFIRMASI” yang dihitung', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Ditahan' },
  { cek: 'Satuan', aturan: 'Penulisan satuan dirapikan', tingkat: 'Biasa', tingkatTone: 'slate', akibat: 'Dirapikan' },
  { cek: 'Periode menu', aturan: 'Periode tidak boleh kosong', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Ditolak / diusulkan' },
  { cek: 'Angka desimal menu', aturan: 'Koma dan titik desimal dirapikan', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Dirapikan' },
  { cek: 'Segmen porsi', aturan: 'Nama segmen dirapikan; Bumil & Busui tetap digabung', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Dirapikan' },
  { cek: 'Bahan menu', aturan: 'Banyak bahan dalam satu sel perlu dicek', tingkat: 'Biasa', tingkatTone: 'slate', akibat: 'Diberi tanda' },
  { cek: 'Penerimaan barang', aturan: 'Kecocokan jumlah barang dari sistem, bukan diisi manual', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Diberi tanda' },
  { cek: 'Data pribadi', aturan: 'NIK, nama, telepon, alamat penerima tidak tampil', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Akses ditutup' },
  { cek: 'Laporan pemerintah', aturan: 'Laporan ke pemerintah tidak dihitung dua kali', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Dihitung sekali' },
  { cek: 'Data kosong', aturan: 'Data yang belum masuk tetap kosong, tidak diisi 0', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Diberi tanda' },
  { cek: 'Pindahan uang', aturan: 'Transfer internal & kas kecil bukan belanja', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Tidak dihitung' },
  { cek: 'Pembayaran supplier', aturan: 'Urutan: barang diterima → input → disetujui → dibayar', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Ditandai / ditolak' },
  { cek: 'Waktu bayar supplier', aturan: 'Dibayar di hari yang sama atau H+1', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Diberi tanda' },
  { cek: 'Simalungun', aturan: 'Kategori yang tidak muncul bukan berarti nol', tingkat: 'Penting', tingkatTone: 'amber', akibat: 'Diberi tanda' },
  { cek: 'Porsi tersalurkan', aturan: 'Jumlah porsi per segmen = total porsi tersalurkan', tingkat: 'Sangat penting', tingkatTone: 'red', akibat: 'Angka ditahan' },
];

const KODE: { daftar: string; pilihan: string[]; catatan: string }[] = [
  { daftar: 'Dapur', pilihan: ['SKN Sukun', 'LWG Lawang', 'DNM Donomulyo', 'PCK Poncokusumo', 'SML Kahean', 'TRN Turen'], catatan: 'Kode tetap' },
  { daftar: 'Jenis transaksi', pilihan: ['Penerimaan', 'Isi kas kecil', 'Belanja', 'Insentif', 'Penggajian'], catatan: 'Daftar tetap' },
  { daftar: 'Kategori pengeluaran', pilihan: ['Bahan Baku', 'Operasional', 'Insentif & Fasilitas', 'Kas kecil'], catatan: 'Perlu disetujui Finance' },
  { daftar: 'Status konfirmasi', pilihan: ['Draft', 'Perlu dicek', 'Terkonfirmasi'], catatan: 'Hanya Terkonfirmasi yang dihitung' },
  { daftar: 'Segmen porsi', pilihan: ['Kecil', 'Besar', 'Balita', 'Bumil', 'Busui', 'Bumil & Busui (gabungan)'], catatan: 'Gabungan tidak dipecah' },
  { daftar: 'Satuan', pilihan: ['kg', 'gram', 'pcs', 'pax', 'liter', 'karton', 'pack', 'sak'], catatan: 'Daftar satuan' },
  { daftar: 'Asal data', pilihan: ['Input Maker', 'Master Menu', 'EFI', 'SIPGN', 'POP', 'Aksis', 'MPM', 'Isi manual'], catatan: 'Daftar tetap' },
  { daftar: 'Waktu bayar', pilihan: ['Hari yang sama', 'H+1', 'Terlambat'], catatan: 'Usulan' },
];

export default async function up(db: Prisma.TransactionClient) {
  const rows = [
    ...KAMUS.map((fields, i) => ({ kind: 'KAMUS' as const, sortOrder: i, fields })),
    ...ATURAN.map((fields, i) => ({ kind: 'ATURAN' as const, sortOrder: i, fields })),
    ...KODE.map((fields, i) => ({ kind: 'KODE' as const, sortOrder: i, fields })),
  ];
  await db.referenceEntry.createMany({ data: rows });
}
