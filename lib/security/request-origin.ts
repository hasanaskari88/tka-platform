/**
 * Validasi same-origin yang tetap bekerja pada domain Production dan alias Vercel.
 * Origin browser harus cocok dengan host request, host yang diteruskan Vercel,
 * atau URL situs Production yang dikonfigurasi. Header Origin tetap wajib ada.
 */
export function isSameOriginRequest(request: Request): boolean {
  const originHeader = request.headers.get('origin')
  if (!originHeader) return false

  let origin: string
  try {
    origin = new URL(originHeader).origin
  } catch {
    return false
  }

  const allowedOrigins = new Set<string>()
  const addOrigin = (value: string | null | undefined) => {
    if (!value) return
    try {
      allowedOrigins.add(new URL(value).origin)
    } catch {
      // Abaikan header atau konfigurasi yang tidak valid.
    }
  }

  addOrigin(request.url)
  addOrigin(process.env.NEXT_PUBLIC_SITE_URL)

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const requestHost = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const protocol = forwardedProto || new URL(request.url).protocol.replace(':', '')

  if (requestHost && (protocol === 'http' || protocol === 'https')) {
    addOrigin(`${protocol}://${requestHost}`)
  }

  if (!allowedOrigins.has(origin)) return false

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') return false

  return true
}
