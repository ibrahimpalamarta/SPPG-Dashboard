import { apiFetch } from "@/lib/api";

/** SCRUM-125: the browser has no backend token, so the download goes through the session here. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const res = await apiFetch(`/upload-batches/templates/${encodeURIComponent(kind)}`);
  if (!res.ok) return new Response("Template tidak tersedia", { status: res.status });
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") ?? "", "Content-Disposition": res.headers.get("content-disposition") ?? "" },
  });
}
