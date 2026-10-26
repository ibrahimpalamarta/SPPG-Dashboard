/**
 * Production guard: qa-audit only ever talks to the throwaway runner
 * (localhost) or to the one staging host named in QA_STAGING_URL. Anything
 * else stops the run before a browser starts or a seed is written.
 */
const LOCAL = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function allowedHosts(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const hosts = new Set(LOCAL);
  if (env.QA_STAGING_URL) hosts.add(new URL(env.QA_STAGING_URL).hostname);
  return hosts;
}

export function assertSafeTarget(url: string, env: NodeJS.ProcessEnv = process.env): void {
  const host = new URL(url).hostname;
  if (!allowedHosts(env).has(host)) {
    throw new Error(`qa-audit guard: host "${host}" bukan target yang diizinkan (localhost atau QA_STAGING_URL). Run dihentikan.`);
  }
}
