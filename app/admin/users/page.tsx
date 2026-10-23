'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

function AdminUsersContent() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'admin' | 'student'>('ALL')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // State Form Tambah User
  const [newUsername, setNewUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [classCode, setClassCode] = useState('XII-A')
  const [userPassword, setUserPassword] = useState('')
  const [confirmUserPassword, setConfirmUserPassword] = useState('')
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student')
  const [createMsg, setCreateMsg] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // State Modal Edit User
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editFullName, setEditFullName] = useState('')
  const [editClassCode, setEditClassCode] = useState('')
  const [editRole, setEditRole] = useState<'student' | 'admin'>('student')
  const [editPassword, setEditPassword] = useState('')
  const [confirmEditPassword, setConfirmEditPassword] = useState('')
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [editMsg, setEditMsg] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const fetchUsers = async () => {
    const supabase = createClient()

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      setCurrentUserId(authData.user.id)
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setProfiles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 1. Tambah Akun Baru
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateMsg(null)

    // Validasi Kesamaan Password
    if (userPassword !== confirmUserPassword) {
      setCreateMsg('Error: Konfirmasi password tidak cocok!')
      setIsCreating(false)
      return
    }

    const supabase = createClient()
    const cleanUsername = newUsername.trim().toLowerCase()
    const fakeEmail = `${cleanUsername}@grisan.com`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: fakeEmail,
      password: userPassword,
      options: {
        data: {
          username: cleanUsername,
          full_name: fullName.trim(),
          class_code: classCode.trim().toUpperCase(),
          role: userRole,
        },
      },
    })

    if (authError) {
      setCreateMsg(`Error Auth: ${authError.message}`)
      setIsCreating(false)
      return
    }

    if (authData.user) {
      await supabase.from('profiles').upsert(
        {
          id: authData.user.id,
          username: cleanUsername,
          full_name: fullName.trim(),
          class_code: classCode.trim().toUpperCase(),
          role: userRole,
        },
        { onConflict: 'id' }
      )

      setCreateMsg(`Akun "${cleanUsername}" (${userRole.toUpperCase()}) berhasil dibuat!`)
      setNewUsername('')
      setFullName('')
      setUserPassword('')
      setConfirmUserPassword('')
      fetchUsers()
    }

    setIsCreating(false)
  }

  // 2. Buka Modal Edit User
  const handleOpenEditModal = (user: any) => {
    setEditingUser(user)
    setEditFullName(user.full_name || '')
    setEditClassCode(user.class_code || '')
    setEditRole(user.role || 'student')
    setEditPassword('')
    setConfirmEditPassword('')
    setShowEditPassword(false)
    setEditMsg(null)
  }

  // 3. Simpan Edit User & Reset Password
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSavingEdit(true)
    setEditMsg(null)

    // Validasi Reset Password jika Diisi
    if (editPassword.trim()) {
      if (editPassword.length < 6) {
        setEditMsg('Error: Password baru minimal 6 karakter!')
        setIsSavingEdit(false)
        return
      }
      if (editPassword !== confirmEditPassword) {
        setEditMsg('Error: Konfirmasi password baru tidak cocok!')
        setIsSavingEdit(false)
        return
      }
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          fullName: editFullName.trim(),
          classCode: editClassCode.trim().toUpperCase(),
          role: editRole,
          newPassword: editPassword.trim() || undefined,
        }),
      })

      const resData = await res.json()

      if (!res.ok) {
        setEditMsg(`Error: ${resData.error}`)
      } else {
        setEditMsg('Data pengguna berhasil diperbarui!')
        setTimeout(() => {
          setEditingUser(null)
          fetchUsers()
        }, 1000)
      }
    } catch (err: any) {
      setEditMsg(`Gagal menyimpan: ${err.message}`)
    }

    setIsSavingEdit(false)
  }

  // 4. Hapus User
  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === currentUserId) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang login!')
      return
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus akun "@${username}" secara permanen?`)) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        fetchUsers()
      } else {
        const resData = await res.json()
        alert(`Gagal menghapus: ${resData.error}`)
      }
    } catch (err: any) {
      alert(`Gagal menghapus pengguna: ${err.message}`)
    }
  }

  const filteredProfiles = profiles.filter((p) => {
    const nameMatch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const userMatch = p.username?.toLowerCase().includes(searchTerm.toLowerCase())
    const classMatch = p.class_code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSearch = nameMatch || userMatch || classMatch
    const matchesRole = filterRole === 'ALL' || (p.role || 'student') === filterRole

    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              👥 Kelola Akun & Pengguna
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Daftarkan pengguna baru, edit data, reset password, dan hapus akun
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ← Kembali ke Admin CMS
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah Pengguna */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-sm font-bold text-slate-800 mb-3 pb-2 border-b">
              ➕ Mendaftarkan Pengguna Baru
            </h2>

            {createMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium mb-3 ${
                  createMsg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {createMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3" suppressHydrationWarning>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: admin2 atau budi123"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Pengguna"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kode Kelas / Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII-A atau ADMIN"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  suppressHydrationWarning
                />
              </div>

              {/* Input Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password Akun
                </label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimal 6 Karakter"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-3 py-1.5 pr-10 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    title={showUserPassword ? 'Sembunyikan' : 'Tampilkan'}
                    suppressHydrationWarning
                  >
                    {showUserPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Input Konfirmasi Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Masukkan Ulang Password
                </label>
                <div className="relative">
                  <input
                    type={showUserPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi Password"
                    value={confirmUserPassword}
                    onChange={(e) => setConfirmUserPassword(e.target.value)}
                    className={`w-full px-3 py-1.5 pr-10 rounded-lg border text-xs focus:ring-2 focus:outline-none ${
                      confirmUserPassword && confirmUserPassword !== userPassword
                        ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                        : 'border-slate-300 focus:ring-indigo-600'
                    }`}
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPassword(!showUserPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    title={showUserPassword ? 'Sembunyikan' : 'Tampilkan'}
                    suppressHydrationWarning
                  >
                    {showUserPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmUserPassword && confirmUserPassword !== userPassword && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">
                    ⚠️ Password tidak cocok!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Peran / Role
                </label>
                <select
                  value={userRole}
                  onChange={(e: any) => setUserRole(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  suppressHydrationWarning
                >
                  <option value="student">STUDENT (Siswa)</option>
                  <option value="admin">ADMIN (Guru/Pengelola)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50"
                suppressHydrationWarning
              >
                {isCreating ? 'Menambahkan...' : 'Buat Akun'}
              </button>
            </form>
          </div>

          {/* Tabel Daftar Pengguna */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <input
                type="text"
                placeholder="🔍 Cari nama, username, atau kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                suppressHydrationWarning
              />

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">Filter Role:</span>
                <select
                  value={filterRole}
                  onChange={(e: any) => setFilterRole(e.target.value)}
                  className="px-2.5 py-1 border rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  suppressHydrationWarning
                >
                  <option value="ALL">Semua Peran ({profiles.length})</option>
                  <option value="admin">ADMIN Saja</option>
                  <option value="student">STUDENT Saja</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-500 text-xs">Memuat data pengguna...</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b">
                    <tr>
                      <th className="p-3 font-bold">Nama Lengkap & Username</th>
                      <th className="p-3 font-bold text-center">Kode Kelas</th>
                      <th className="p-3 font-bold text-center">Role Akses</th>
                      <th className="p-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfiles.length > 0 ? (
                      filteredProfiles.map((p) => {
                        const isAdmin = p.role === 'admin'
                        const isSelf = p.id === currentUserId

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{p.full_name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400">@{p.username}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 bg-slate-100 font-semibold text-slate-600 rounded">
                                {p.class_code || '-'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                                  isAdmin
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}
                              >
                                {p.role || 'student'}
                              </span>
                            </td>
                            <td className="p-3 text-center space-x-1">
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-bold transition-colors"
                                suppressHydrationWarning
                              >
                                ✏️ Edit / Reset
                              </button>
                              <button
                                onClick={() => handleDeleteUser(p.id, p.username)}
                                disabled={isSelf}
                                className="px-2 py-1 text-red-500 hover:text-red-700 font-semibold disabled:opacity-30"
                                suppressHydrationWarning
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          Tidak ditemukan pengguna yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Edit & Reset Password Pengguna */}
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-800 text-base">
                  ✏️ Edit Akun & Reset Password: @{editingUser.username}
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                  suppressHydrationWarning
                >
                  ✕
                </button>
              </div>

              {editMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium ${
                    editMsg.startsWith('Error')
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {editMsg}
                </div>
              )}

              <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs" suppressHydrationWarning>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Kelas / Label
                  </label>
                  <input
                    type="text"
                    required
                    value={editClassCode}
                    onChange={(e) => setEditClassCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    suppressHydrationWarning
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran Akses (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e: any) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    suppressHydrationWarning
                  >
                    <option value="student">STUDENT (Siswa)</option>
                    <option value="admin">ADMIN (Guru/Pengelola)</option>
                  </select>
                </div>

                {/* Input Reset Password Baru */}
                <div className="pt-2 border-t space-y-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reset Password Baru (Opsional)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        minLength={6}
                        placeholder="Kosongkan jika tidak diubah"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        title={showEditPassword ? 'Sembunyikan' : 'Tampilkan'}
                        suppressHydrationWarning
                      >
                        {showEditPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Input Masukkan Ulang Password Baru */}
                  {editPassword.trim().length > 0 && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Masukkan Ulang Password Baru
                      </label>
                      <div className="relative">
                        <input
                          type={showEditPassword ? 'text' : 'password'}
                          minLength={6}
                          placeholder="Ulangi Password Baru"
                          value={confirmEditPassword}
                          onChange={(e) => setConfirmEditPassword(e.target.value)}
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:outline-none ${
                            confirmEditPassword && confirmEditPassword !== editPassword
                              ? 'border-red-400 focus:ring-red-500 bg-red-50/30'
                              : 'border-slate-300 focus:ring-indigo-600'
                          }`}
                          suppressHydrationWarning
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          title={showEditPassword ? 'Sembunyikan' : 'Tampilkan'}
                          suppressHydrationWarning
                        >
                          {showEditPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {confirmEditPassword && confirmEditPassword !== editPassword && (
                        <p className="text-[10px] text-red-500 mt-1 font-medium">
                          ⚠️ Password baru tidak cocok!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                    suppressHydrationWarning
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    suppressHydrationWarning
                  >
                    {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat halaman pengguna...</p>
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  )
}