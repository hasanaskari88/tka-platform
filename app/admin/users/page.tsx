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
  const [filterClass, setFilterClass] = useState<string>('ALL')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // State Checkbox Seleksi Cetak
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  // State Form Tambah User
  const [newUsername, setNewUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [classCode, setClassCode] = useState('VIB')
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

  // State Modal Bulk Import
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkInputText, setBulkInputText] = useState('')
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [isProcessingBulk, setIsProcessingBulk] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      setCurrentUserId(authData.user.id)
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('class_code', { ascending: true })
      .order('full_name', { ascending: true })

    if (data) setProfiles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // 1. Ekstraksi Daftar Kelas Unik
  const classList = Array.from(
    new Set(profiles.map((p) => p.class_code || p.class_label).filter(Boolean))
  )

  // 2. Tambah Akun Baru (Supabase Auth + Fake Email @grisan.com)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateMsg(null)

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
          plain_password: userPassword,
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

  // 3. Buka Modal Edit User
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

  // 4. Simpan Edit User & Reset Password (Via API Route)
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSavingEdit(true)
    setEditMsg(null)

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

  // 5. Hapus User (Via API Route)
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

  // 6. Download Template CSV untuk Bulk Import
  const handleDownloadTemplate = () => {
    const csvHeader = 'username,full_name,class_code,password,role\n'
    const csvSample =
      'ulfah,TABINA ULFAH ARDANI,VIB,123456,student\n' +
      'yoga,YOGA AGUNG WIBOWO,VIB,123456,student\n' +
      'yasin,YASIN PUSPITA,VIB,123456,student\n'

    const blob = new Blob([csvHeader + csvSample], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'template_import_user_cbt.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 7. Memproses Bulk Import Massal dengan Domain @grisan.com
  const handleProcessBulkImport = async () => {
    if (!bulkInputText.trim()) return alert('Masukkan teks CSV atau isi file lebih dulu!')
    setIsProcessingBulk(true)
    setBulkMessage('Memproses pendaftaran massal...')

    const lines = bulkInputText.trim().split('\n')
    const rowsToInsert: any[] = []

    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('username')) return

      const cols = line.split(',').map((c) => c.trim())
      if (cols.length >= 4) {
        const uName = cols[0].toLowerCase()
        rowsToInsert.push({
          username: uName,
          full_name: cols[1],
          class_code: cols[2].toUpperCase(),
          plain_password: cols[3],
          role: cols[4] ? cols[4].toLowerCase() : 'student',
        })
      }
    })

    if (rowsToInsert.length === 0) {
      setIsProcessingBulk(false)
      return setBulkMessage('Format data tidak valid. Pastikan dipisahkan dengan tanda koma.')
    }

    const supabase = createClient()
    const { error } = await supabase.from('profiles').insert(rowsToInsert)

    if (error) {
      setBulkMessage(`Gagal import: ${error.message}`)
    } else {
      setBulkMessage(`✅ Berhasil mengimpor ${rowsToInsert.length} akun pengguna!`)
      setBulkInputText('')
      fetchUsers()
      setTimeout(() => setIsBulkModalOpen(false), 1500)
    }
    setIsProcessingBulk(false)
  }

  // 8. Filter Pengguna Berdasarkan Pencarian, Role, dan Kelas
  const filteredProfiles = profiles.filter((p) => {
    const nameMatch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const userMatch = p.username?.toLowerCase().includes(searchTerm.toLowerCase())
    const classMatch = p.class_code?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSearch = nameMatch || userMatch || classMatch

    const matchesRole = filterRole === 'ALL' || (p.role || 'student') === filterRole
    const userClass = p.class_code || p.class_label || ''
    const matchesClass = filterClass === 'ALL' || userClass === filterClass

    return matchesSearch && matchesRole && matchesClass
  })

  // 9. Penanganan Checkbox Seleksi Kartu
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredProfiles.map((p) => p.id))
    } else {
      setSelectedUserIds([])
    }
  }

  const handleToggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((item) => item !== id))
    } else {
      setSelectedUserIds([...selectedUserIds, id])
    }
  }

  const handleTriggerPrint = () => {
    if (selectedUserIds.length === 0) {
      return alert('Pilih setidaknya satu siswa menggunakan checkbox untuk dicetak!')
    }
    window.print()
  }

  const selectedUserObjects = profiles.filter((p) => selectedUserIds.includes(p.id))

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* GAYA KHUSUS CETAK Halaman A4 (3 Kolom x 5 Baris = 15 Kartu) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 4mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Navbar />
      </div>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 no-print">
        <div className="flex flex-col md:flex-row justify-between md:items-center border-b pb-4 border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
              <span>👥</span>
              <span>Kelola Akun & Pengguna</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Daftarkan pengguna baru, import massal, edit data, reset password, dan cetak kartu login.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>📥</span>
              <span>Import User Massal</span>
            </button>

            <button
              onClick={handleTriggerPrint}
              disabled={selectedUserIds.length === 0}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                selectedUserIds.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              suppressHydrationWarning
            >
              <span>🖨️</span>
              <span>Cetak {selectedUserIds.length} Kartu Selected</span>
            </button>

            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ← Kembali ke Admin CMS
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Tambah Pengguna */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-fit space-y-3">
            <h2 className="text-sm font-bold text-slate-800 pb-2 border-b flex items-center space-x-1">
              <span>➕</span>
              <span>Mendaftarkan Pengguna Baru</span>
            </h2>

            {createMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kode Kelas / Label</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII-A atau VIB"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  suppressHydrationWarning
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password Akun</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Masukkan Ulang Password</label>
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
                </div>
                {confirmUserPassword && confirmUserPassword !== userPassword && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">⚠️ Password tidak cocok!</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Peran / Role</label>
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

          {/* Tabel Pengguna & Bilah Filter */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="🔍 Cari nama, username, atau kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />

                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-2.5 py-1 border rounded-lg text-xs font-semibold text-indigo-700 focus:outline-none"
                  suppressHydrationWarning
                >
                  <option value="ALL">🏫 Semua Kelas ({classList.length} Kelas)</option>
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>

                <select
                  value={filterRole}
                  onChange={(e: any) => setFilterRole(e.target.value)}
                  className="px-2.5 py-1 border rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                  suppressHydrationWarning
                >
                  <option value="ALL">👤 Semua Peran ({profiles.length})</option>
                  <option value="admin">ADMIN Saja</option>
                  <option value="student">STUDENT Saja</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredProfiles.length > 0 &&
                      filteredProfiles.every((p) => selectedUserIds.includes(p.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Pilih Semua Siswa ({filteredProfiles.length})</span>
                </label>

                <span className="font-bold text-indigo-600">
                  {selectedUserIds.length} Siswa Terpilih untuk Dicetak
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-slate-500 text-xs">Memuat data pengguna...</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 border-b">
                    <tr>
                      <th className="p-3 w-10 text-center font-bold">Pilih</th>
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
                        const isSelected = selectedUserIds.includes(p.id)

                        return (
                          <tr
                            key={p.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              isSelected ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectUser(p.id)}
                                className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                              />
                            </td>
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
                        <td colSpan={5} className="p-6 text-center text-slate-400">
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
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Kode Kelas / Label</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Peran Akses (Role)</label>
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

      {/* Area Cetak Kartu (15 per Lembar A4) */}
      <div id="print-area" className="hidden print:block">
        <div className="grid grid-cols-3 gap-2.5">
          {selectedUserObjects.map((user, idx) => (
            <div
              key={user.id || idx}
              className="border-2 border-dashed border-slate-400 p-2.5 rounded-xl bg-white text-slate-900 flex flex-col justify-between break-inside-avoid h-[54mm] relative"
            >
              <div className="flex items-center space-x-2 border-b pb-1.5 border-slate-300">
                <img
                  src="/logo-sd-getasan.png"
                  alt="Logo"
                  className="w-7 h-7 object-contain"
                  onError={(e: any) => (e.target.style.display = 'none')}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9.5px] font-black leading-tight text-indigo-950 uppercase truncate">
                    SD NEGERI GETASAN
                  </h4>
                  <p className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-tighter">
                    KARTU LOGIN UJIAN CBT TKA
                  </p>
                </div>
                <span className="px-1.5 py-0.5 text-[8px] font-black bg-indigo-100 text-indigo-800 rounded border border-indigo-200 shrink-0">
                  {user.class_code || user.class_label || 'VIB'}
                </span>
              </div>

              <div className="my-1 space-y-1">
                <div>
                  <span className="text-[7.5px] text-slate-500 font-bold uppercase block">
                    Nama Peserta Ujian:
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-900 block truncate leading-tight">
                    {user.full_name || 'Siswa CBT'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 font-mono text-[9px]">
                  <div>
                    <span className="text-[7px] font-sans text-slate-500 block uppercase font-bold">
                      Username:
                    </span>
                    <span className="font-bold text-indigo-700 truncate block">
                      {user.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-[7px] font-sans text-slate-500 block uppercase font-bold">
                      Password:
                    </span>
                    <span className="font-bold text-rose-600 truncate block">
                      {user.plain_password || '123456'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[7.5px] text-slate-500 font-medium">
                <span>🌐 grisan.vercel.app</span>
                <span className="font-bold text-slate-400">✂️ Garis Potong</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Import Pengguna Banyak */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-xs no-print">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center space-x-1.5">
                <span>📥</span>
                <span>Import Pengguna Banyak (Bulk Import)</span>
              </h3>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
                suppressHydrationWarning
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-indigo-900 text-xs">📄 Belum punya format file?</h4>
                <p className="text-[11px] text-indigo-700">
                  Unduh contoh berkas CSV standar agar tidak salah memasukkan data.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center space-x-1 shadow-sm"
                suppressHydrationWarning
              >
                <span>⬇️</span>
                <span>Download Template CSV</span>
              </button>
            </div>

            {bulkMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  bulkMessage.startsWith('Gagal') || bulkMessage.startsWith('Format')
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {bulkMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="block font-bold text-slate-700">
                Tempelkan (Paste) Teks CSV di Sini:
              </label>
              <textarea
                rows={6}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder="username,full_name,class_code,password,role&#10;ulfah,TABINA ULFAH ARDANI,VIB,123456,student&#10;yoga,YOGA AGUNG WIBOWO,VIB,123456,student"
                className="w-full p-3 border rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-[11px] text-slate-500">
                *Format per baris: <code className="font-bold">username,full_name,class_code,password,role</code>
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                suppressHydrationWarning
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                disabled={isProcessingBulk}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                suppressHydrationWarning
              >
                {isProcessingBulk ? 'Memproses...' : '🚀 Simpan & Daftarkan Massal'}
              </button>
            </div>
          </div>
        </div>
      )}
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