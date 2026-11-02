import { cookies } from "next/headers";

export const DEV_MODE_COOKIE = "dev_mode";

/** Upload History's development switch (deletes, incl. PUBLISHED). Shared by both history lists, survives reloads. */
export async function isDevMode(): Promise<boolean> {
  return (await cookies()).get(DEV_MODE_COOKIE)?.value === "1";
}
