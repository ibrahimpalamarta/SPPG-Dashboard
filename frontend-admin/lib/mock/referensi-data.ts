// ponytail: static reference content until a Data Reference API exists; replace with a fetch then.
import type { Tone } from "@/components/ui/badge";

export const TABS = [
  { id: "kamus", label: "Kamus Data" },
  { id: "format", label: "Format File" },
  { id: "alur", label: "Alur Data" },
  { id: "aturan", label: "Aturan Cek Data" },
  { id: "kode", label: "Daftar Kode" },
  { id: "keputusan", label: "Keputusan Tertunda" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

// [nama data, artinya, contoh, wajib, aturan, kerahasiaan]
type Kamus = [string, string, string, string, string, string];
export const kamusData: Kamus[] = [
  ["Kode upload", "Kode unik untuk setiap file yang diunggah", "UPL-SKN-20261008-001", "Ya", "Dibuat otomatis oleh sistem", "Internal"],
  ["Nomor baris sumber", "Penanda baris asal di file", "SRC-SKN-CF-000001", "Ya", "Unik per file", "Internal"],
  ["Kode dapur", "Dapur pemilik data", "SKN", "Ya", "Diambil dari pilihan saat unggah", "Internal"],
  ["Asal data", "Sistem atau file asal data", "Input Maker", "Ya", "Dari daftar tetap", "Internal"],
  ["Nama file", "Nama file asli yang diunggah", "[SKN] CASHFLOW SUKUN.xlsx", "Ya", "Disimpan apa adanya", "Internal"],
  ["Versi format", "Versi format file yang dipakai", "v1.0", "Ya", "Setiap perubahan format membuat versi baru", "Internal"],
  ["Format file", "Aturan membaca kolom file per dapur", "MAP-SKN-CF-001", "Ya", "Lihat tab Format File", "Internal"],
  ["Waktu masuk", "Kapan data masuk ke sistem", "08 Okt 2026 10:30", "Ya", "Dicatat otomatis", "Internal"],
  ["Nomor baris", "Nomor urut baris di file", "1", "Ya", "Jika kosong, diisi nomor urut", "Internal"],
  ["Nomor transaksi", "Nomor satu transaksi (bisa beberapa baris barang)", "TXN-B0004", "Ya", "Unik per dapur", "Internal"],
  ["Tanggal transaksi", "Tanggal uang keluar/masuk", "22 Feb 2026", "Ya", "Format tanggal dirapikan", "Internal"],
  ["Jenis transaksi", "Belanja, insentif, gaji, penerimaan, dll.", "BELANJA", "Ya", "Dari daftar tetap", "Internal"],
  ["Uang masuk / keluar", "Arah uang", "KELUAR", "Ya", "MASUK atau KELUAR", "Internal"],
  ["Kategori", "Kelompok pengeluaran", "Bahan Baku", "Ya", "Disamakan dengan daftar kategori", "Internal"],
  ["Nama supplier (asli)", "Nama penerima uang seperti tertulis di file", "Bedjo Untung", "Ya", "Disimpan apa adanya", "Internal"],
  ["Harga satuan", "Harga per satuan barang", "65000", "Kadang", "Penulisan Rupiah dirapikan", "Internal"],
  ["Harga per baris", "Harga satu baris barang", "1885000", "Kadang", "≈ jumlah × harga satuan", "Internal"],
  ["Total transaksi", "Total satu transaksi", "1885000", "Ya", "Dihitung sekali, bukan per baris", "Internal"],
  ["Status konfirmasi", "Apakah baris sudah dikonfirmasi dapur", "TERKONFIRMASI", "Ya", "Hanya Terkonfirmasi yang dihitung", "Internal"],
  ["Supplier", "Supplier setelah nama digabung", "Toko Nasya", "Tidak", "Nama asli tetap disimpan", "Internal"],
  ["Porsi rencana", "Jumlah porsi yang direncanakan", "1661", "Ya", "Per segmen; beda dengan porsi aktual", "Internal"],
  ["Saldo rekening", "Saldo akhir hari", "186420500", "Ya", "Sumber resmi belum diputuskan (OD-02)", "Internal"],
  ["Jumlah penerima", "Rencana dan aktual penerima per hari", "2348 / belum ada", "Ya", "Rencana & aktual dipisah; kosong ≠ 0", "Internal (total saja)"],
  ["Segmen porsi", "Kelompok porsi", "Kecil", "Ya", "Kecil, Besar, Balita, Bumil & Busui", "Internal"],
  ["Data pribadi penerima", "NIK, nama, telepon, alamat", "(dirahasiakan)", "Tidak", "Tidak tampil di dashboard", "Rahasia"],
];

// [format file, dapur, jenis data, contoh nama file, status, berlaku mulai]
const READY: [string, Tone] = ["Siap dipakai", "green"];
const COMPARE: [string, Tone] = ["Dipakai (pembanding)", "violet"];
const PHASE_2A: [string, Tone] = ["Disiapkan untuk Phase 2a", "slate"];
const FIX: [string, Tone] = ["Perlu perbaikan", "red"];
const TRIAL: [string, Tone] = ["Uji coba (opsional)", "slate"];
type Format = [string, string, string, string, [string, Tone], string];
export const formatFile: Format[] = [
  ["Cashflow Upload v1", "Sukun", "Cashflow", "[SKN] CASHFLOW SUKUN.xlsx", READY, "2026-11-02"],
  ["Cashflow Upload v1", "Lawang", "Cashflow", "[LWG] CASHFLOW LAWANG.xlsx", COMPARE, "2026-11-23"],
  ["Cashflow Upload v1", "Donomulyo", "Cashflow", "[DNM] CASHFLOW DONOMULYO.xlsx", PHASE_2A, "2026-12-07"],
  ["Cashflow Upload v1", "Poncokusumo", "Cashflow", "[PCK] CASHFLOW PONCOKUSUMO.xlsx", PHASE_2A, "2026-12-07"],
  ["Cashflow Upload v1", "Kahean", "Cashflow", "[SML] CASHFLOW SIMALUNGUN.xlsx", FIX, "TBD"],
  ["Menu Upload v1", "Sukun", "Master Menu", "[SKN] MASTER DATA MENU - SUKUN.xlsx", READY, "2026-11-02"],
  ["Menu Upload v1", "Lawang", "Master Menu", "[LWG] MASTER DATA MENU - LAWANG.xlsx", COMPARE, "2026-11-23"],
  ["Menu Upload v1", "Donomulyo", "Master Menu", "[DNM] MASTER DATA MENU - DONOMULYO.xlsx", READY, "2026-12-07"],
  ["Menu Upload v1", "Poncokusumo", "Master Menu", "[PCK] MASTER DATA MENU - PONCOKUSUMO.xlsx", READY, "2026-12-07"],
  ["Menu Upload v1", "Kahean", "Master Menu", "[SML] MASTER DATA MENU - SIMALUNGUN.xlsx", FIX, "TBD"],
  ["Format RAB Sukun v1", "Sukun", "RAB", "RAB PERIODE*.xlsx", READY, "2026-11-02"],
  ["Format PO Sukun v1", "Sukun", "Purchase Order", "List PO for next week.xlsx", READY, "2026-11-02"],
  ["SKN Goods Receipt source profile v1", "Sukun", "Penerimaan Barang", "Terima Barang / GRN-Daily.xlsx", TRIAL, "2026-11-02"],
  ["Format Payment Sukun v1", "Sukun", "Pembayaran Supplier", "Cleaned Input Maker / EFI export", READY, "2026-11-02"],
];

export const alurLangkah = ["File dari dapur", "Disimpan", "Dicek & dirapikan", "Disetujui PM", "Tampil di dashboard"];

// [angka, diambil dari]
export const asalAngka: [string, string][] = [
  ["Top 5 Supplier", "Cashflow (per baris barang)"],
  ["Top 5 Menu", "Master Menu"],
  ["Informasi Gizi", "Master Menu + jumlah porsi tersalurkan"],
  ["Komposisi Pengeluaran", "Cashflow (kategori)"],
  ["Saldo Rekening", "Laporan saldo"],
  ["Transfer EFI Terakhir", "Cashflow / catatan transfer"],
  ["Penerima Manfaat", "Jumlah penerima per hari"],
  ["Kelengkapan Data", "Riwayat upload + daftar data wajib"],
];

const VITAL: [string, Tone] = ["Sangat penting", "red"];
const IMPORTANT: [string, Tone] = ["Penting", "amber"];
const NORMAL: [string, Tone] = ["Biasa", "slate"];
// [yang dicek, aturan, tingkat, jika tidak sesuai]
type Aturan = [string, string, [string, Tone], string];
export const aturanCek: Aturan[] = [
  ["Semua data", "Kode dapur, kode upload, dan nomor baris harus ada", VITAL, "Ditolak"],
  ["Tanggal", "Tanggal dirapikan; tanggal yang tidak mungkin ditolak", IMPORTANT, "Ditolak / dicek"],
  ["Rupiah", "Angka Rupiah dirapikan (Rp, spasi, titik dihapus)", IMPORTANT, "Dirapikan"],
  ["Total transaksi", "Total dihitung sekali per transaksi, bukan per baris barang", VITAL, "Angka ditahan"],
  ["Harga baris", "Harga baris kira-kira = jumlah × harga satuan", IMPORTANT, "Diberi tanda"],
  ["Status konfirmasi", "Hanya baris “TERKONFIRMASI” yang dihitung", IMPORTANT, "Ditahan"],
  ["Satuan", "Penulisan satuan dirapikan", NORMAL, "Dirapikan"],
  ["Periode menu", "Periode tidak boleh kosong", IMPORTANT, "Ditolak / diusulkan"],
  ["Angka desimal menu", "Koma dan titik desimal dirapikan", IMPORTANT, "Dirapikan"],
  ["Segmen porsi", "Nama segmen dirapikan; Bumil & Busui tetap digabung", IMPORTANT, "Dirapikan"],
  ["Bahan menu", "Banyak bahan dalam satu sel perlu dicek", NORMAL, "Diberi tanda"],
  ["Penerimaan barang", "Kecocokan jumlah barang dari sistem, bukan diisi manual", VITAL, "Diberi tanda"],
  ["Data pribadi", "NIK, nama, telepon, alamat penerima tidak tampil", VITAL, "Akses ditutup"],
  ["Laporan pemerintah", "Laporan ke pemerintah tidak dihitung dua kali", VITAL, "Dihitung sekali"],
  ["Data kosong", "Data yang belum masuk tetap kosong, tidak diisi 0", VITAL, "Diberi tanda"],
  ["Pindahan uang", "Transfer internal & kas kecil bukan belanja", VITAL, "Tidak dihitung"],
  ["Pembayaran supplier", "Urutan: barang diterima → input → disetujui → dibayar", VITAL, "Ditandai / ditolak"],
  ["Waktu bayar supplier", "Dibayar di hari yang sama atau H+1", IMPORTANT, "Diberi tanda"],
  ["Simalungun", "Kategori yang tidak muncul bukan berarti nol", IMPORTANT, "Diberi tanda"],
  ["Porsi tersalurkan", "Jumlah porsi per segmen = total porsi tersalurkan", VITAL, "Angka ditahan"],
];

// [daftar, pilihan, catatan]
export const daftarKode: [string, string[], string][] = [
  ["Dapur", ["SKN Sukun", "LWG Lawang", "DNM Donomulyo", "PCK Poncokusumo", "SML Kahean", "TRN Turen"], "Kode tetap"],
  ["Jenis transaksi", ["Penerimaan", "Isi kas kecil", "Belanja", "Insentif", "Penggajian"], "Daftar tetap"],
  ["Kategori pengeluaran", ["Bahan Baku", "Operasional", "Insentif & Fasilitas", "Kas kecil"], "Perlu disetujui Finance"],
  ["Status konfirmasi", ["Draft", "Perlu dicek", "Terkonfirmasi"], "Hanya Terkonfirmasi yang dihitung"],
  ["Segmen porsi", ["Kecil", "Besar", "Balita", "Bumil", "Busui", "Bumil & Busui (gabungan)"], "Gabungan tidak dipecah"],
  ["Satuan", ["kg", "gram", "pcs", "pax", "liter", "karton", "pack", "sak"], "Daftar satuan"],
  ["Asal data", ["Input Maker", "Master Menu", "EFI", "SIPGN", "POP", "Aksis", "MPM", "Isi manual"], "Daftar tetap"],
  ["Waktu bayar", ["Hari yang sama", "H+1", "Terlambat"], "Usulan"],
];

// [kode, yang perlu diputuskan, penanggung jawab, yang tertunda, sudah diputuskan]
export const keputusan: [string, string, string, string, boolean][] = [
  ["OD-01", "Konfirmasi pilot Sukun & pembanding Lawang", "Product + MBG", "Cakupan pilot & UAT", true],
  ["OD-02", "Sumber resmi saldo rekening (VA/Aksis, mutasi bank, atau LapKeu)", "Finance", "Angka saldo resmi", false],
  ["OD-03", "Arti pasti “transfer EFI”", "Finance/COO", "Angka transfer EFI resmi", false],
  ["OD-04", "Cara hitung biaya rencana vs aktual per porsi Besar/Kecil", "Finance + Gizi + COO", "Rumus biaya per porsi", false],
  ["OD-05", "Dasar harga “Harga Bahan” di menu", "Gizi + Finance", "Cek biaya menu", false],
  ["OD-06", "Bumil & Busui tetap digabung atau dipisah", "Program/Gizi", "Analisis per segmen", false],
  ["OD-07", "Siapa yang mengunggah dan siapa yang mengecek", "Product/Ops", "Hak akses & pelatihan", true],
  ["OD-08", "Apakah SIPGN/Aksis/POP/MPM bisa diekspor otomatis", "Product/Program", "Integrasi", false],
  ["OD-09", "Akses data pribadi penerima", "Program + Security", "Impor data pribadi", false],
  ["OD-10", "Target waktu packing/pengiriman/sampel + penanggung jawab komplain", "Ops/Program", "Angka Phase 2a", false],
  ["OD-11", "Seberapa jauh data lama diunggah", "Product/Data", "Grafik tren & data UAT", false],
  ["OD-12", "Syarat siap untuk Simalungun", "Head of MBG", "Mulai Phase 2b", false],
  ["OD-13", "Cara ranking Top 5 Menu, acuan gizi per segmen, & sumber resmi porsi tersalurkan", "Gizi + Program + PM MBG", "Kartu Menu & Gizi resmi", false],
];
