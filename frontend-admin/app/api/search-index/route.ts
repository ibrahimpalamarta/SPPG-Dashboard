import { apiFetch } from "@/lib/api";
import { getT } from "@/lib/lang-server";
import { formatFile } from "@/lib/mock/referensi-data";
import { DOMAINS, STATUS } from "@/lib/upload";

export type SearchEntry = { kind: "upload" | "format"; title: string; subtitle: string; href: string; page: string };

type Batch = { publicId: string; fileName: string; domain: string; status: string; kitchen: { name: string } };

/** One index for the header search: recent uploads (backend scopes them to the user's dapur) plus the known file formats. Matching happens in the browser. */
export async function GET() {
  const [t, res] = await Promise.all([getT(), apiFetch("/upload-batches?pageSize=100")]);
  const batches: Batch[] = res.ok ? (await res.json()).data : [];

  const uploads: SearchEntry[] = batches.map((b) => ({
    kind: "upload",
    title: b.publicId,
    subtitle: [b.fileName, b.kitchen.name, t(DOMAINS.find((d) => d.value === b.domain)?.label ?? b.domain), t(STATUS[b.status as keyof typeof STATUS]?.label ?? b.status)].join(" · "),
    href: `/mapping-validasi?batch=${b.publicId}`,
    page: "/mapping-validasi",
  }));
  const formats: SearchEntry[] = formatFile.map(([name, dapur, jenis, file]) => ({
    kind: "format",
    title: name,
    subtitle: `${dapur} · ${t(jenis)} · ${file}`,
    href: "/referensi-data?tab=format",
    page: "/referensi-data",
  }));

  return Response.json([...uploads, ...formats]);
}
