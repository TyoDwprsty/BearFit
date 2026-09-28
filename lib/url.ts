/**
 * Public origin of the current request, e.g. `https://bearfit.vercel.app`.
 * Honours the forwarding headers set by Vercel / reverse proxies so redirects
 * always point back at the domain the user is actually on (never a hard-coded
 * localhost). Falls back to Next's own view of the request URL.
 */
export function requestOrigin(request: { headers: Headers; nextUrl: URL }): string {
  const host = firstValue(request.headers.get("x-forwarded-host")) ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    firstValue(request.headers.get("x-forwarded-proto")) ??
    (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? "http" : request.nextUrl.protocol.replace(":", ""));
  return `${proto}://${host}`;
}

function firstValue(header: string | null): string | null {
  const v = header?.split(",")[0]?.trim();
  return v || null;
}
