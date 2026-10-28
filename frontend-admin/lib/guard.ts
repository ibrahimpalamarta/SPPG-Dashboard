import { forbidden } from "next/navigation";
import { NAV, canOpen, type NavHref } from "@/lib/nav";
import { getMe, type Me } from "@/lib/me";

/**
 * First line of every page: renders app/forbidden.tsx (403) when the role
 * lacks the page's permission, so a deep link fails the same way a hidden menu
 * item would. The API behind the page enforces it again.
 */
export async function requirePage(href: NavHref): Promise<Me> {
  const me = await getMe();
  const page = NAV.find((n) => n.href === href)!;
  if (!canOpen(page, me)) forbidden();
  return me;
}
