import { requireTrustedAdmin } from './trusted-admin'

export async function requireAdmin() {
  const admin = await requireTrustedAdmin()

  if (!admin.authorized) {
    return admin
  }

  return {
    authorized: true as const,
    supabase: admin.supabase,
    user: admin.user,
  }
}
