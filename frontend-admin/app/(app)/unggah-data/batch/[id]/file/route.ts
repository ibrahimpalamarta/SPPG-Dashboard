import { apiFetch } from "@/lib/api";

/** Export in upload history: the browser has no backend token, so the download goes through the session here. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch(`/upload-batches/${encodeURIComponent(id)}/file`);
  if (!res.ok) return new Response("File tidak tersedia", { status: res.status });
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") ?? "", "Content-Disposition": res.headers.get("content-disposition") ?? "" },
  });
}
