/**
 * Product events (PRD §11.1): one structured JSON line on stdout, which
 * Cloud Logging already collects from Cloud Run.
 *
 * ponytail: no analytics vendor yet. Swap the body of this function when one
 * is picked; call sites stay as they are. Never pass PII or file contents.
 */
export function trackEvent(name: string, props: Record<string, string | number | null>): void {
  console.log(JSON.stringify({ event: name, at: new Date().toISOString(), ...props }));
}
