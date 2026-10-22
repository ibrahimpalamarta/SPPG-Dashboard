// ponytail: static mockup data until the upload API exists; replace with a fetch then.
export type UploadStatus = "pending-pm" | "in-review" | "published" | "replaced";

type Uploader = { name: string; initials: string; color: string };

type Upload = {
  file: string;
  code: string;
  kitchen: string;
  type: string;
  uploader: Uploader;
  time: string;
  status: UploadStatus;
};

const dewi = { name: "Dewi Lestari", initials: "DL", color: "bg-blue-600" };
const rina = { name: "Rina Kartika", initials: "RK", color: "bg-indigo-500" };
const nanda = { name: "Nanda Putri", initials: "NP", color: "bg-violet-600" };
const maya = { name: "Maya Anggraini", initials: "MA", color: "bg-teal-600" };

export const uploads: Upload[] = [
  { file: "RAB PERIODE 14 - SUKUN.xlsx", code: "UPL-SKN-20261109-003", kitchen: "Sukun", type: "RAB", uploader: dewi, time: "09 Nov 2026 16:05", status: "pending-pm" },
  { file: "List PO for next week.xlsx", code: "UPL-SKN-20261109-002", kitchen: "Sukun", type: "Purchase Order", uploader: dewi, time: "09 Nov 2026 14:31", status: "in-review" },
  { file: "Input Maker Agustus P14.xlsx", code: "UPL-SKN-20261108-001", kitchen: "Sukun", type: "Pembayaran Supplier", uploader: rina, time: "08 Nov 2026 10:12", status: "published" },
  { file: "[SKN] MASTER DATA MENU - SUKUN.xlsx", code: "UPL-SKN-20261106-002", kitchen: "Sukun", type: "Master Menu", uploader: nanda, time: "06 Nov 2026 13:20", status: "published" },
  { file: "Laporan VA Harian Agustus.xlsx", code: "UPL-SKN-20261105-001", kitchen: "Sukun", type: "Saldo Rekening", uploader: rina, time: "05 Nov 2026 09:44", status: "published" },
  { file: "[SKN] CASHFLOW_SUKUN_P13.xlsx", code: "UPL-SKN-20261103-002", kitchen: "Sukun", type: "Cashflow", uploader: dewi, time: "03 Nov 2026 15:22", status: "published" },
  { file: "[SKN] CASHFLOW_SUKUN_P13 (draft).xlsx", code: "UPL-SKN-20261103-001", kitchen: "Sukun", type: "Cashflow", uploader: dewi, time: "03 Nov 2026 11:02", status: "replaced" },
  { file: "[LWG] MASTER DATA MENU - LAWANG.xlsx", code: "UPL-LWG-20261106-002", kitchen: "Lawang", type: "Master Menu", uploader: maya, time: "06 Nov 2026 14:05", status: "published" },
  { file: "[LWG] CASHFLOW LAWANG.xlsx", code: "UPL-LWG-20261106-001", kitchen: "Lawang", type: "Cashflow", uploader: rina, time: "06 Nov 2026 09:15", status: "published" },
];
