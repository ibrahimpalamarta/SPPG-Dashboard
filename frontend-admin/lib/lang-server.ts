import { cache } from "react";
import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, toLang } from "@/lib/lang";

export const getLang = cache(async () => toLang((await cookies()).get(LANG_COOKIE)?.value));

/** Server-side `t` for the language in the `lang` cookie. */
export const getT = async () => makeT(await getLang());
