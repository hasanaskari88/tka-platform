
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export default function FontTestPage() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: `
      <h2>Silakan mencoba editor</h2>
      <p>Ketik teks biasa di sini.</p>
      <p>Contoh teks Arab: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
      <p>Contoh Aksara Jawa: ꦲꦤꦕꦫꦏ ꦢꦠꦱꦮꦭ</p>
    `,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[220px] p-4 outline-none text-slate-800 leading-relaxed',
      },
    },
  })

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Pengujian Font dan Editor Soal
        </h1>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-bold">
            1. Pengujian Font Arab
          </h2>
          <div lang="ar" dir="rtl" className="font-arabic text-3xl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-bold">
            2. Pengujian Aksara Jawa
          </h2>
          <div lang="jv" className="font-aksara-jawa text-3xl">
            ꦲꦤꦕꦫꦏ ꦢꦠꦱꦮꦭ ꦥꦝꦗꦪꦚ
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-3 text-lg font-bold">
            3. Editor Teks Uji Coba
          </h2>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className="rounded border px-3 py-2 font-bold"
            >
              B
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className="rounded border px-3 py-2 italic"
            >
              I
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className="rounded border px-3 py-2"
            >
              • Daftar
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className="rounded border px-3 py-2"
            >
              1. Daftar
            </button>
          </div>

          <EditorContent editor={editor} />

          <p className="mt-3 text-xs text-slate-500">
            Coba mengetik, menebalkan tulisan, membuat daftar, serta
            menyalin teks Arab dan Aksara Jawa ke dalam editor.
          </p>
        </section>
      </div>
    </main>
  )
}
