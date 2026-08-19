import type { PendistribusianMbg, Prisma } from '@prisma/client';

/**
 * SCRUM-15: 6 dapur saat peluncuran, dan tabel rujukan AKG (SCRUM-8, 12
 * kelompok sasaran). Ditulis dengan `upsert` walau `prisma/seed.ts` sudah
 * memastikan seeder ini paling banyak jalan sekali per database — itu
 * mencegah re-run di database yang SAMA, bukan tabrakan `name`/`kelompokSasaran`
 * kalau seeder yang sama sengaja dijalankan lagi terhadap database lain yang
 * sebagiannya sudah terisi manual.
 *
 * TODO(catatan): hanya nama yang tersedia. Master dapur belum ada sebagai
 * berkas — "SPPG Data points" 9.1 menandai tabel kitchen "build new" dan
 * mencatat nama dapur "today only implied by sheet name". Wilayah
 * (province/city_regency/district/village), `type` (basah/kering), dan
 * koordinat sengaja dibiarkan NULL, bukan ditebak: lima nama pertama mengarah
 * ke Malang sedangkan Simalungun ada di Sumatera Utara, jadi menebak wilayah
 * dari nama akan salah. Lengkapi setelah master dapur diterima.
 */
const KITCHENS = ['Donomulyo', 'Sukun', 'Lawang', 'Poncokusumo', 'Simalungun', 'Turen'];

interface AkgRow {
  kelompokSasaran: string;
  pendistribusianMbg: PendistribusianMbg;
  rujukanPctAkg: string;
  energi: [number, number];
  protein: [number, number];
  lemak: [number, number];
  karbohidrat: [number, number];
}

/**
 * Tabel rujukan AKG — 12 kelompok sasaran, Tabel 2 SOP-OPR-001
 * (Juknis 401.1/2025), disalin dari dokumen rujukan yang ditunjuk SCRUM-8
 * ("SPPG Data points" 3.1). Angka ditulis apa adanya, tanpa pembulatan.
 *
 * TODO(catatan): tabel rujukan TIDAK memuat kolom Serat, sementara SCRUM-8 dan
 * SCRUM-12 memintanya. `seratMin`/`seratMax` karena itu tidak diisi di sini dan
 * tetap NULL — nilainya perlu dikonfirmasi ke Program Team sebelum compliance
 * Serat boleh dihitung.
 */
const AKG_TARGETS: AkgRow[] = [
  { kelompokSasaran: 'Siswa TK/PAUD/TKLB', pendistribusianMbg: 'PAGI', rujukanPctAkg: '20-25%', energi: [280, 350], protein: [5.0, 6.3], lemak: [10.0, 12.5], karbohidrat: [44.0, 55.0] },
  { kelompokSasaran: 'Siswa SD Kelas 1-3', pendistribusianMbg: 'PAGI', rujukanPctAkg: '20-25%', energi: [330, 413], protein: [8.0, 10.0], lemak: [11.0, 13.8], karbohidrat: [50.0, 62.5] },
  { kelompokSasaran: 'Siswa SD Kelas 4-6', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [585, 683], protein: [15.8, 18.4], lemak: [19.5, 22.8], karbohidrat: [87.0, 101.5] },
  { kelompokSasaran: 'Siswa SMP', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [668, 779], protein: [20.3, 23.6], lemak: [22.5, 26.3], karbohidrat: [97.5, 113.8] },
  { kelompokSasaran: 'Siswa SMA/SMK', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [713, 831], protein: [21.0, 24.5], lemak: [22.5, 26.3], karbohidrat: [105.0, 122.5] },
  { kelompokSasaran: 'Pendidik', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [713, 831], protein: [21.0, 24.5], lemak: [22.5, 26.3], karbohidrat: [105.0, 122.5] },
  { kelompokSasaran: 'Tenaga Kependidikan', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [713, 831], protein: [21.0, 24.5], lemak: [22.5, 26.3], karbohidrat: [105.0, 122.5] },
  { kelompokSasaran: 'Anak Balita', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [405, 473], protein: [6.0, 7.0], lemak: [13.5, 15.8], karbohidrat: [64.5, 75.3] },
  { kelompokSasaran: 'Anak Balita 13-59 bln', pendistribusianMbg: 'PAGI', rujukanPctAkg: '20-25%', energi: [270, 338], protein: [4.0, 5.0], lemak: [9.0, 11.3], karbohidrat: [43.0, 53.8] },
  { kelompokSasaran: 'Balita 6-11 bln', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [240, 280], protein: [4.5, 5.2], lemak: [10.5, 12.2], karbohidrat: [31.5, 36.7] },
  { kelompokSasaran: 'Ibu Hamil', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [753, 879], protein: [22.1, 25.8], lemak: [20.2, 23.6], karbohidrat: [118.5, 138.3] },
  { kelompokSasaran: 'Ibu Menyusui', pendistribusianMbg: 'SIANG', rujukanPctAkg: '30-35%', energi: [782, 912], protein: [26.3, 30.6], lemak: [20.2, 23.5], karbohidrat: [123.0, 143.5] },
];

export default async function up(db: Prisma.TransactionClient) {
  for (const name of KITCHENS) {
    await db.kitchen.upsert({
      where: { name },
      create: { name },
      // Nama adalah kunci alaminya; kolom lain sengaja tidak ditimpa supaya
      // data wilayah yang sudah diisi manual tidak terhapus saat seed diulang.
      update: {},
    });
  }

  for (const t of AKG_TARGETS) {
    const values = {
      rujukanPctAkg: t.rujukanPctAkg,
      energiMin: t.energi[0],
      energiMax: t.energi[1],
      proteinMin: t.protein[0],
      proteinMax: t.protein[1],
      lemakMin: t.lemak[0],
      lemakMax: t.lemak[1],
      karbohidratMin: t.karbohidrat[0],
      karbohidratMax: t.karbohidrat[1],
    };
    await db.akgTarget.upsert({
      where: {
        kelompokSasaran_pendistribusianMbg: {
          kelompokSasaran: t.kelompokSasaran,
          pendistribusianMbg: t.pendistribusianMbg,
        },
      },
      create: {
        kelompokSasaran: t.kelompokSasaran,
        pendistribusianMbg: t.pendistribusianMbg,
        ...values,
      },
      update: values,
    });
  }
}
