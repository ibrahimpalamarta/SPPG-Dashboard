// ponytail: static mockup data until the menu/nutrition API exists; replace with a fetch then.
export const filters = ["Periode: 10 – 21 Agu 2026", "Semua dapur"];

export const topMenus = [
  { name: "Susu UHT", kitchens: "Sukun, Lawang", days: 6 },
  { name: "Tumis Labu Siam", kitchens: "Lawang", days: 2 },
  { name: "Jeruk", kitchens: "Lawang", days: 2 },
  { name: "Acar sayur", kitchens: "Lawang", days: 1 },
  { name: "Sate Ayam", kitchens: "Lawang", days: 1 },
];

export const segments = [
  { label: "Besar", portions: 7569, color: "#059669" },
  { label: "Kecil", portions: 10603, color: "#10b981" },
  { label: "Balita", portions: 1804, color: "#34d399" },
  { label: "Bumil & Busui", portions: 815, color: "#a7f3d0" },
];

export const portionNote = "Sukun belum ada data porsi tersalurkan, jadi tidak dihitung (bukan 0).";

export const nutrients = [
  { label: "Energi", unit: "kkal", large: 640.0, small: 484.3 },
  { label: "Protein", unit: "g", large: 24.7, small: 19.6 },
  { label: "Lemak", unit: "g", large: 21.5, small: 17.4 },
  { label: "Karbohidrat", unit: "g", large: 88.2, small: 63.6 },
  { label: "Serat", unit: "g", large: 3.9, small: 3.2 },
];

export const dataNote = "Sukun: Data menu baru ada sampai 14 Agu (5 hari).";
