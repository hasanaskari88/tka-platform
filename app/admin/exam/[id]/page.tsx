'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import RichTextEditor from '@/components/editor/RichTextEditor'
import BulkUploadModal from '@/components/BulkUploadModal'
import Link from 'next/link'

const DEFAULT_KEYS = ['A', 'B', 'C', 'D']

// Helper Normalisasi Opsi PG/PG Kompleks (Selalu 4 Opsi A, B, C, D)
function getNormalizedOptions(rawOptions: any) {
  const optsArray = Array.isArray(rawOptions) ? rawOptions : []
  return DEFAULT_KEYS.map((key, index) => {
    const found =
      optsArray.find((o: any) => typeof o === 'object' && o?.key === key) ||
      optsArray[index]

    if (typeof found === 'string' || typeof found === 'number') {
      return { key, text: String(found), image_url: '' }
    } else if (found && typeof found === 'object') {
      return {
        key: found.key || key,
        text: found.text !== undefined && found.text !== null ? String(found.text) : '',
        image_url: found.image_url ? String(found.image_url) : '',
      }
    }
    return { key, text: '', image_url: '' }
  })
}

// Helper Normalisasi Pernyataan Matriks
function getNormalizedStatements(rawOptions: any, correctAnswers: any) {
  const stArray = Array.isArray(rawOptions) ? rawOptions : []
  if (stArray.length === 0) {
    return [
      { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
      { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
    ]
  }
  return stArray.map((st: any, idx: number) => {
    const stId = String(st.id || idx + 1)
    let cVal = 'Benar'
    if (correctAnswers && typeof correctAnswers === 'object' && correctAnswers[stId]) {
      cVal = String(correctAnswers[stId])
    } else if (st.correct_val) {
      cVal = String(st.correct_val)
    }
    return {
      id: stId,
      text: typeof st === 'string' ? st : String(st.text || ''),
      image_url: st.image_url ? String(st.image_url) : '',
      correct_val: cVal,
    }
  })
}

function hasRichContent(value: string) {
  const html = String(value || '')
  const text = html
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .trim()

  return text.length > 0 || /<img\b/i.test(html) || /data-type=["'](?:inline|block)-math["']/i.test(html)
}

type DocxSettings = { schoolName: string; schoolAddress: string; title: string; instructions: string; orientation: string; includeAnswerKey: boolean; includeExplanations: boolean }
type DocxQuestion = { id: string; question_text?: string | null; image_url?: string | null; options?: any; question_type?: string | null; correct_option?: string | null; correct_answer?: string | null; correct_answers?: any; explanation?: string | null }
const docxEncoder = new TextEncoder()
function docxEsc(v: unknown) { return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;') }
function docxMath(v: string) { return v.replace(/\$\$?|\\\(|\\\)|\\\[|\\\]/g,'').replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g,'($1)/($2)').replace(/\\sqrt\s*\{([^{}]*)\}/g,'√($1)').replace(/\\times\b/g,'×').replace(/\\cdot\b/g,'·').replace(/\\div\b/g,'÷').replace(/\\pi\b/g,'π').replace(/\\leq?\b/g,'≤').replace(/\\geq?\b/g,'≥').replace(/\\neq\b/g,'≠').replace(/\\pm\b/g,'±').replace(/\^\{([^{}]*)\}/g,'^$1').replace(/_\{([^{}]*)\}/g,'_$1').replace(/\\text\s*\{([^{}]*)\}/g,'$1').replace(/[{}]/g,'') }
function docxCrc(bytes: Uint8Array) { let c=0xffffffff; for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0)} return (c^0xffffffff)>>>0 }
function docxZip(entries: {name:string;data:Uint8Array}[]) {
 const u16=(n:number)=>new Uint8Array([n&255,n>>>8&255]),u32=(n:number)=>new Uint8Array([n&255,n>>>8&255,n>>>16&255,n>>>24&255])
 const join=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out}
 const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0
 for(const e of entries){const name=docxEncoder.encode(e.name),data=e.data,crc=docxCrc(data);const file=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);local.push(file);central.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=file.length}
 const dir=join(central),end=join([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(dir.length),u32(offset),u16(0)]);return join([...local,dir,end])
}
function docxP(value:string,bold=false,center=false,size=22){return '<w:p><w:pPr>'+(center?'<w:jc w:val="center"/>':'')+'<w:spacing w:before="0" w:after="100" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia" w:cs="Georgia"/></w:rPr><w:t xml:space="preserve">'+docxEsc(value)+'</w:t></w:r></w:p>'}
async function exportQuestionPaperDocx(settings:DocxSettings,questions:DocxQuestion[],examTitle:string,subtest:string,duration:number|null) {
 const media:{name:string;data:Uint8Array}[]=[],rels:string[]=[],types=new Set<string>();let imageNo=0,drawNo=0
 const addImage=async(src:string,alt:string)=>{
  try{const response=await fetch(src,{mode:'cors',credentials:'omit'});if(!response.ok)throw Error();const blob=await response.blob(),mime=blob.type.toLowerCase();const ext=mime==='image/png'?'png':mime==='image/gif'?'gif':mime==='image/bmp'?'bmp':'jpg';if(!['image/png','image/jpeg','image/jpg','image/gif','image/bmp'].includes(mime))throw Error();const name='image'+(++imageNo)+'.'+ext,rid='rId'+(imageNo+1),type=mime==='image/jpg'?'image/jpeg':mime;types.add('<Default Extension="'+ext+'" ContentType="'+type+'"/>');media.push({name:'word/media/'+name,data:new Uint8Array(await blob.arrayBuffer())});rels.push('<Relationship Id="'+rid+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+name+'"/>');const id=++drawNo,w=4200000,h=2600000;return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+w+'" cy="'+h+'"/><wp:docPr id="'+id+'" name="'+docxEsc(alt)+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+id+'" name="'+name+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+w+'" cy="'+h+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
  }catch{return '<w:r><w:t>'+docxEsc('[Gambar '+alt+' tidak dapat disematkan: akses gambar dibatasi]')+'</w:t></w:r>'}
 }
 const rich=async(html:string)=>{
  if(!html)return '';const root=document.createElement('div');root.innerHTML=html;const out:string[]=[]
  const inline=async(node:Node):Promise<string>=>{
   if(node.nodeType===Node.TEXT_NODE){const text=docxMath(node.textContent||'');if(!text)return '';const rtl=/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/.test(text);return '<w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia" w:cs="Georgia"/>'+(rtl?'<w:rtl/>':'')+'</w:rPr><w:t xml:space="preserve">'+docxEsc(text)+'</w:t></w:r>'}
   if(!(node instanceof HTMLElement))return '';const tag=node.tagName.toLowerCase();if(tag==='br')return '<w:r><w:br/></w:r>';if(tag==='img')return addImage(node.getAttribute('src')||'',node.getAttribute('alt')||'gambar');if(node.classList.contains('katex-mathml'))return ''
   const inner=(await Promise.all(Array.from(node.childNodes).map(inline))).join('');if(tag==='strong'||tag==='b')return inner.replace(/<w:rPr>/g,'<w:rPr><w:b/>');if(tag==='em'||tag==='i')return inner.replace(/<w:rPr>/g,'<w:rPr><w:i/>');if(tag==='u')return inner.replace(/<w:rPr>/g,'<w:rPr><w:u w:val="single"/>');return inner
  }
  for(const node of Array.from(root.childNodes)){
   if(node instanceof HTMLElement&&node.tagName.toLowerCase()==='table'){const rows:string[]=[];for(const tr of Array.from(node.querySelectorAll('tr'))){const cells:string[]=[];for(const cell of Array.from(tr.children)){const runs=(await Promise.all(Array.from(cell.childNodes).map(inline))).join('');cells.push('<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr><w:p>'+runs+'</w:p></w:tc>')}rows.push('<w:tr>'+cells.join('')+'</w:tr>')}out.push('<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>'+rows.join('')+'</w:tbl>')}
   else{const runs=await inline(node);if(runs)out.push('<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>'+runs+'</w:p>')}
  }return out.join('')
 }
 const identityCell=(value:string)=>'<w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/><w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/></w:tcMar></w:tcPr>'+docxP(value,false,false,20)+'</w:tc>';
  const identityTable='<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid><w:tr>'+identityCell('Nama: ........................................................................')+identityCell('Kelas: ....................................')+'</w:tr><w:tr>'+identityCell('Nomor: ......................................................................')+identityCell('Tanggal: ................................')+'</w:tr></w:tbl>';
  const instructionTable='<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="9CA3AF"/><w:left w:val="single" w:sz="6" w:color="9CA3AF"/><w:bottom w:val="single" w:sz="6" w:color="9CA3AF"/><w:right w:val="single" w:sz="6" w:color="9CA3AF"/></w:tblBorders><w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:left w:w="180" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="180" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tr><w:tc><w:tcPr><w:tcW w:w="9360" w:type="dxa"/></w:tcPr>'+docxP('Petunjuk: '+(settings.instructions||'Bacalah setiap soal dengan teliti.'),false,false,20)+'</w:tc></w:tr></w:tbl>';
  const body:string[]=[docxP(settings.schoolName||'Nama Sekolah',true,true,30),...(settings.schoolAddress?[docxP(settings.schoolAddress,false,true,18)]:[]),'<w:p><w:pPr><w:pBdr><w:bottom w:val="double" w:sz="12" w:space="5" w:color="111827"/></w:pBdr><w:spacing w:after="120"/></w:pPr><w:r><w:t></w:t></w:r></w:p>',docxP(settings.title||examTitle||'Naskah Soal',true,true,28),docxP((subtest||'Mata Pelajaran')+' · '+questions.length+' Soal · Waktu '+(duration||'—')+' menit',false,true,20),identityTable,instructionTable]
 for(let i=0;i<questions.length;i++){const q=questions[i],type=q.question_type||'multiple_choice',options=Array.isArray(q.options)?q.options:[];body.push(docxP((i+1)+'.',true));body.push(await rich(q.question_text||''));if(q.image_url)body.push('<w:p>'+await addImage(q.image_url,'ilustrasi soal')+'</w:p>')
  if(type==='true_false_matrix'){const rows:string[]=[];for(const [index,opt] of options.entries()){const key=String(opt.key??opt.id??index+1),label=await rich(opt.text||''),image=opt.image_url?'<w:p>'+await addImage(opt.image_url,'gambar pernyataan '+key)+'</w:p>':'';rows.push('<w:tr><w:tc><w:tcPr><w:tcW w:w="7000" w:type="dxa"/></w:tcPr>'+label+image+'</w:tc><w:tc>'+docxP('Benar')+'</w:tc><w:tc>'+docxP('Salah')+'</w:tc></w:tr>')}body.push('<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>'+rows.join('')+'</w:tbl>')}
  else if(options.length){for(const [index,opt] of options.entries()){const key=String(opt.key??String.fromCharCode(65+index)),value=typeof opt==='string'?opt:opt.text||opt.title||'';body.push(docxP(key+'. ')+await rich(value));if(typeof opt==='object'&&opt.image_url)body.push('<w:p>'+await addImage(opt.image_url,'gambar pilihan '+key)+'</w:p>')}}
  else if(type==='essay'){body.push(docxP('................................................................................................................'));body.push(docxP('................................................................................................................'));body.push(docxP('................................................................................................................'))}
  if(settings.includeAnswerKey){const answers=q.correct_answers,key=type==='true_false_matrix'&&answers&&typeof answers==='object'?Object.entries(answers).map(([k,v])=>k+': '+String(v)).join('; '):Array.isArray(answers)?answers.join(', '):String(q.correct_answer||q.correct_option||'');body.push(docxP('Kunci: '+(key||'Belum diisi'),true,false,18));if(settings.includeExplanations&&q.explanation){body.push(docxP('Pembahasan:',true,false,18));body.push(await rich(q.explanation))}}
  body.push(docxP(''))
 }
 body.push('<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="9CA3AF"/></w:pBdr><w:spacing w:before="240" w:after="0"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="6B7280"/><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/></w:rPr><w:t xml:space="preserve">'+docxEsc((settings.schoolName||'')+' · '+(examTitle||''))+'</w:t></w:r></w:p>');
  const pw=settings.orientation==='landscape'?16838:11906,ph=settings.orientation==='landscape'?11906:16838
 const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body.join('')+'<w:sectPr><w:pgSz w:w="'+pw+'" w:h="'+ph+'"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="500" w:footer="500"/></w:sectPr></w:body></w:document>'
 const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+Array.from(types).join('')+'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
 const root='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
 const dr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+rels.join('')+'</Relationships>'
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>'
 const entries=[{name:'[Content_Types].xml',data:docxEncoder.encode(ct)},{name:'_rels/.rels',data:docxEncoder.encode(root)},{name:'word/document.xml',data:docxEncoder.encode(doc)},{name:'word/styles.xml',data:docxEncoder.encode(styles)},{name:'word/_rels/document.xml.rels',data:docxEncoder.encode(dr)},...media]
 const blob=new Blob([docxZip(entries).buffer as ArrayBuffer],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),base=(settings.title||examTitle||'Naskah-Soal').replace(/[\\/:*?"<>|]+/g,'-').trim()||'Naskah-Soal',url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=base+'.docx';document.body.appendChild(a);a.click();a.remove();window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}



function QuestionManagerContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Mode Navigasi Tab: 'form' (Input/Edit) atau 'list' (Daftar Soal)
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('list')

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false)
  const [quickEditQuestion, setQuickEditQuestion] = useState<any>(null)
  const [quickEditData, setQuickEditData] = useState<any>(null)
  const [quickEditSaving, setQuickEditSaving] = useState(false)
  const [isBankImportModalOpen, setIsBankImportModalOpen] = useState(false)
  const [importSourceExams, setImportSourceExams] = useState<any[]>([])
  const [selectedImportExamId, setSelectedImportExamId] = useState('')
  const [importCandidateQuestions, setImportCandidateQuestions] = useState<any[]>([])
  const [selectedImportQuestionIds, setSelectedImportQuestionIds] = useState<string[]>([])
  const [importSearchTerm, setImportSearchTerm] = useState('')
  const [loadingImportSources, setLoadingImportSources] = useState(false)
  const [loadingImportQuestions, setLoadingImportQuestions] = useState(false)
  const [importingSelectedQuestions, setImportingSelectedQuestions] = useState(false)
  const [isDocxExporting, setIsDocxExporting] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

  // Checklist Seleksi Massal & Sorting/Filter
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>('created_asc')
  const [filterType, setFilterType] = useState<string>('ALL')

  // State Form Soal
  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix' | 'essay'
  >('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxScore, setMaxScore] = useState(1.0)
  const [explanation, setExplanation] = useState('')

  // State Opsi PG & PG Kompleks
  const [options, setOptions] = useState([
    { key: 'A', text: '', image_url: '' },
    { key: 'B', text: '', image_url: '' },
    { key: 'C', text: '', image_url: '' },
    { key: 'D', text: '', image_url: '' },
  ])

  // State Kunci Jawaban
  const [correctSingleOption, setCorrectSingleOption] = useState('A')
  const [correctComplexOptions, setCorrectComplexOptions] = useState<string[]>([])

  // State Matriks Benar-Salah
  const [statements, setStatements] = useState([
    { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
    { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // Pengaturan dan pratinjau dokumen cetak.
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [printSettings, setPrintSettings] = useState({
    className: '',
    phase: '',
    twoColumns: true,
    includeAnswerKey: true,
    includeExplanations: true,
    logoSizeMm: 14,
    headerFontSize: 9,
    identityFontSize: 8,
    questionFontSize: 10,
    lineHeight: 1,
    questionSpacingMm: 3,
    columnGapMm: 5,
  })

  const loadData = async () => {
    if (!examId) return
    const supabase = createClient()

    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (examData) setExam(examData)
    if (questionData) setQuestions(questionData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [examId])

  // 1. 📊 FUNGSI EXPORT KE EXCEL (.XLSX)
  const handleExportExcel = async () => {
    if (questions.length === 0) {
      alert('Belum ada soal untuk diekspor!')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const excelRows = questions.map((q, idx) => {
        let optionsText = ''
        if (Array.isArray(q.options)) {
          optionsText = q.options
            .map((o: any) => (o.key ? `${o.key}. ${o.text}` : `${o.id || ''}. ${o.text}`))
            .join(' | ')
        }

        let keyText = ''
        if (Array.isArray(q.correct_answers)) {
          keyText = q.correct_answers.join(', ')
        } else if (typeof q.correct_option === 'object' && q.correct_option !== null) {
          keyText = JSON.stringify(q.correct_option)
        } else {
          keyText = String(q.correct_option || '')
        }

        return {
          No: idx + 1,
          'Tipe Soal': q.question_type || 'multiple_choice',
          Pertanyaan: q.question_text || '',
          'Pilihan / Pernyataan': optionsText,
          'Kunci Jawaban': keyText,
          Pembahasan: q.explanation || '-',
          'Bobot Poin': q.max_score || 1,
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(excelRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Soal')

      const fileName = `Soal_${(exam?.title || 'Ujian').replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (err) {
      alert('Gagal mengekspor ke Excel. Pastikan modul xlsx tersedia.')
    }
  }

  // 2. 🖨️ FUNGSI EXPORT / CETAK PDF (A4 2 KOLOM)
  const handleExportPDF = () => {
    if (questions.length === 0) {
      alert('Belum ada soal untuk dicetak!')
      return
    }
    setShowPrintPreview(true)
  }

  const handlePrintNow = () => {
    window.print()
  }

  // HANDLER CHECKLIST & BATCH SELECTION
  const handleToggleSelectAll = (targetQuestions: any[]) => {
    if (selectedIds.length === targetQuestions.length && targetQuestions.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(targetQuestions.map((q) => q.id))
    }
  }

  const handleToggleSelectOne = (qId: string) => {
    if (selectedIds.includes(qId)) {
      setSelectedIds(selectedIds.filter((id) => id !== qId))
    } else {
      setSelectedIds([...selectedIds, qId])
    }
  }

  // HANDLER HAPUS TERPILIH & HAPUS SEMUA
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} soal yang dipilih?\n\n⚠️ Soal yang dihapus tidak dapat dikembalikan!`
    )
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().in('id', selectedIds)

    if (error) {
      alert(`Gagal menghapus soal terpilih: ${error.message}`)
    } else {
      alert(`✅ Berhasil menghapus ${selectedIds.length} soal terpilih!`)
      setSelectedIds([])
      loadData()
    }
  }

  const handleDeleteAllQuestions = async () => {
    if (questions.length === 0) return
    const confirmDelete = confirm(
      `⚠️ PERINGATAN BATCH DELETE!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA (${questions.length}) soal pada ujian ini?\n\nTindakan ini bersifat permanen!`
    )
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().eq('exam_id', examId)

    if (error) {
      alert(`Gagal menghapus seluruh soal: ${error.message}`)
    } else {
      alert(`🗑️ Seluruh soal pada ujian ini berhasil dihapus!`)
      setSelectedIds([])
      loadData()
    }
  }

  // LOGIKA FILTERING & SORTING DAFTAR SOAL
  const filteredAndSortedQuestions = [...questions]
    .filter((q) => {
      if (filterType === 'ALL') return true
      const qType = q.question_type || 'multiple_choice'
      return qType === filterType
    })
    .sort((a, b) => {
      if (sortBy === 'created_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'score_desc') {
        return (Number(b.max_score) || 1) - (Number(a.max_score) || 1)
      }
      if (sortBy === 'score_asc') {
        return (Number(a.max_score) || 1) - (Number(b.max_score) || 1)
      }
      if (sortBy === 'type') {
        return (a.question_type || '').localeCompare(b.question_type || '')
      }
      return 0
    })

  const handleOptionChange = (
    idx: number,
    field: 'text' | 'image_url',
    value: string
  ) => {
    const updated = [...options]
    updated[idx][field] = value || ''
    setOptions(updated)
  }

  const handleComplexToggle = (key: string) => {
    if (correctComplexOptions.includes(key)) {
      setCorrectComplexOptions(correctComplexOptions.filter((k) => k !== key))
    } else {
      setCorrectComplexOptions([...correctComplexOptions, key])
    }
  }

  const handleStatementChange = (
    idx: number,
    field: 'text' | 'correct_val' | 'image_url',
    val: string
  ) => {
    const updated = [...statements]
    updated[idx][field] = val || ''
    setStatements(updated)
  }

  const addStatement = () => {
    const newId = String(Date.now())
    setStatements([
      ...statements,
      {
        id: newId,
        text: `Pernyataan ${statements.length + 1}`,
        image_url: '',
        correct_val: 'Benar',
      },
    ])
  }

  const removeStatement = (idx: number) => {
    if (statements.length <= 1) {
      alert('Minimal harus ada 1 pernyataan!')
      return
    }
    setStatements(statements.filter((_, i) => i !== idx))
  }

  const resetForm = () => {
    setEditingQuestionId(null)
    setQuestionType('multiple_choice')
    setQuestionText('')
    setImageUrl('')
    setMaxScore(1.0)
    setExplanation('')
    setOptions([
      { key: 'A', text: '', image_url: '' },
      { key: 'B', text: '', image_url: '' },
      { key: 'C', text: '', image_url: '' },
      { key: 'D', text: '', image_url: '' },
    ])
    setCorrectSingleOption('A')
    setCorrectComplexOptions([])
    setStatements([
      { id: '1', text: 'Pernyataan 1', image_url: '', correct_val: 'Benar' },
      { id: '2', text: 'Pernyataan 2', image_url: '', correct_val: 'Salah' },
    ])
  }

  const handleEditClick = (q: any) => {
    setEditingQuestionId(q.id)
    const type = q.question_type || 'multiple_choice'
    setQuestionType(type)
    setQuestionText(q.question_text || '')
    setImageUrl(q.image_url || '')
    setMaxScore(Number(q.max_score) || 1.0)
    setExplanation(q.explanation || '')

    setOptions(getNormalizedOptions(q.options))
    setStatements(getNormalizedStatements(q.options, q.correct_answers))

    if (type === 'multiple_choice') {
      const keyVal = q.correct_option || (Array.isArray(q.correct_answers) ? q.correct_answers[0] : 'A')
      setCorrectSingleOption(String(keyVal).trim().toUpperCase())
    } else if (type === 'complex_multiple_choice') {
      if (Array.isArray(q.correct_answers)) {
        setCorrectComplexOptions(q.correct_answers.map(String))
      } else if (q.correct_option) {
        setCorrectComplexOptions(String(q.correct_option).split(',').map((s) => s.trim()))
      } else {
        setCorrectComplexOptions(['A'])
      }
    }

    setActiveTab('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenQuickEdit = (question: any) => {
    const options = Array.isArray(question.options) ? JSON.parse(JSON.stringify(question.options)) : []
    const type = question.question_type || 'multiple_choice'
    const correctAnswers = question.correct_answers
    const selectedKeys = Array.isArray(correctAnswers)
      ? correctAnswers.map(String)
      : String(question.correct_option || '').split(',').map((value: string) => value.trim()).filter(Boolean)

    setQuickEditQuestion(question)
    setQuickEditData({
      question_text: question.question_text || '',
      image_url: question.image_url || '',
      options,
      correct_option: question.correct_option || 'A',
      selected_keys: selectedKeys,
      matrix_answers: correctAnswers && !Array.isArray(correctAnswers) ? { ...correctAnswers } : {},
      explanation: question.explanation || '',
      max_score: question.max_score ?? 1,
      indicator: question.indicator || '',
      cognitive_level: question.cognitive_level || 'MOTS',
      question_type: type,
    })
    setIsQuickEditOpen(true)
  }

  const handleSaveQuickEdit = async () => {
    if (!quickEditQuestion || !quickEditData || quickEditSaving) return
    const plainText = String(quickEditData.question_text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim()
    if (!plainText && !/<img\b/i.test(quickEditData.question_text || '')) {
      alert('Teks pertanyaan wajib diisi.')
      return
    }
    const score = Number(quickEditData.max_score)
    if (!Number.isFinite(score) || score <= 0) {
      alert('Skor maksimum harus berupa angka lebih dari 0.')
      return
    }

    const type = quickEditData.question_type
    const payload: any = {
      question_text: quickEditData.question_text,
      image_url: String(quickEditData.image_url || '').trim() || null,
      explanation: quickEditData.explanation || null,
      max_score: score,
      indicator: String(quickEditData.indicator || '').trim() || null,
      cognitive_level: quickEditData.cognitive_level || 'MOTS',
    }

    if (['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(type)) {
      payload.options = quickEditData.options
    }
    if (type === 'multiple_choice') {
      payload.correct_option = quickEditData.correct_option
      payload.correct_answers = [quickEditData.correct_option]
    } else if (type === 'complex_multiple_choice') {
      const keys = quickEditData.selected_keys || []
      if (keys.length === 0) {
        alert('Pilih minimal satu kunci jawaban benar.')
        return
      }
      payload.correct_option = keys.join(',')
      payload.correct_answers = keys
    } else if (type === 'true_false_matrix') {
      const answers = quickEditData.matrix_answers || {}
      const missing = quickEditData.options.filter((option: any, index: number) => !answers[String(option.id ?? index + 1)])
      if (missing.length > 0) {
        alert('Tentukan Benar atau Salah untuk setiap pernyataan pada matriks.')
        return
      }
      payload.correct_answers = answers
      payload.correct_option = 'MATRIX'
    }

    setQuickEditSaving(true)
    try {
      const supabase = createClient()
      const targetMode = exam?.target_mode || 'BOTH'
      let examAnswerCount = 0
      let practiceAnswerCount = 0

      if (targetMode !== 'PRACTICE_ONLY') {
        const { count, error } = await supabase
          .from('answers')
          .select('id', { count: 'exact', head: true })
          .eq('question_id', quickEditQuestion.id)
        if (error) throw new Error(`Tidak dapat memeriksa riwayat ujian: ${error.message}`)
        examAnswerCount = count || 0
      }

      if (targetMode !== 'EXAM_ONLY') {
        const { count, error } = await supabase
          .from('practice_attempt_answers')
          .select('id', { count: 'exact', head: true })
          .eq('question_id', quickEditQuestion.id)
        if (error) throw new Error(`Tidak dapat memeriksa riwayat latihan: ${error.message}`)
        practiceAnswerCount = count || 0
      }

      const totalHistoricalAnswers = examAnswerCount + practiceAnswerCount
      if (totalHistoricalAnswers > 0) {
        const historySummary = [
          examAnswerCount > 0 ? `${examAnswerCount} jawaban ujian` : '',
          practiceAnswerCount > 0 ? `${practiceAnswerCount} jawaban latihan` : '',
        ].filter(Boolean).join(' dan ')
        const proceed = confirm(
          `Soal ini sudah memiliki ${historySummary}.\\n\\n` +
          'Perubahan isi, kunci, atau skor tidak menghapus jawaban dan nilai tersimpan, tetapi dapat memengaruhi penilaian jika jawaban dihitung ulang di kemudian hari. Lanjutkan?'
        )
        if (!proceed) return
      }

      const { error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', quickEditQuestion.id)
        .eq('exam_id', examId)
      if (error) throw new Error(`Gagal menyimpan Quick Edit: ${error.message}`)

      alert('Quick Edit berhasil disimpan. Jawaban dan nilai historis tidak diubah.')
      setIsQuickEditOpen(false)
      setQuickEditQuestion(null)
      setQuickEditData(null)
      await fetchExamAndQuestions()
    } catch (error: any) {
      alert(error?.message || 'Terjadi kesalahan saat menyimpan Quick Edit.')
    } finally {
      setQuickEditSaving(false)
    }
  }


  const handleDuplicateQuestion = async (question: any) => {
    if (!confirm('Duplikasi soal ini? Salinan baru akan dibuat dengan ID baru dan soal asli tetap utuh.')) return
    const columns = ['question_text','image_url','options','correct_option','explanation','difficulty','question_type','max_score','correct_answers','indicator','cognitive_level','target_x','target_y','maze_width','maze_height','start_x','start_y','obstacles','answer_mode','correct_answer']
    const copy: Record<string, any> = { exam_id: examId }
    columns.forEach((column) => { copy[column] = question[column] ?? null })
    const supabase = createClient()
    const { error } = await supabase.from('questions').insert(copy)
    if (error) alert(`Gagal menduplikasi soal: ${error.message}`)
    else { alert('Soal berhasil diduplikasi. Salinan baru muncul di daftar soal aktif.'); await loadData(); setActiveTab('list') }
  }

  // 🟢 3. IMPORT TERPILIH: PILIH PAKET SUMBER, PRATINJAU, DAN PILIH SOAL
  const normalizeQuestionText = (value: string) =>
    String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

  const handleOpenBankImport = async () => {
    setIsBankImportModalOpen(true)
    setImportSearchTerm('')
    setSelectedImportExamId('')
    setImportCandidateQuestions([])
    setSelectedImportQuestionIds([])
    setLoadingImportSources(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('id,title,subtest,target_mode,activity_type')
      .neq('id', examId)
      .order('created_at', { ascending: false })

    if (error) {
      alert(`Gagal memuat paket sumber: ${error.message}`)
      setImportSourceExams([])
    } else {
      const currentIsPractice = exam?.target_mode === 'PRACTICE_ONLY'
      const compatible = (data || []).filter((item: any) => {
        const isQuiz = !item.activity_type || item.activity_type === 'QUIZ'
        const sameSystem = currentIsPractice
          ? item.target_mode === 'PRACTICE_ONLY'
          : item.target_mode !== 'PRACTICE_ONLY'
        return isQuiz && sameSystem
      })
      setImportSourceExams(compatible)
    }
    setLoadingImportSources(false)
  }

  const handleSelectImportSource = async (sourceExamId: string) => {
    setSelectedImportExamId(sourceExamId)
    setSelectedImportQuestionIds([])
    setImportCandidateQuestions([])
    if (!sourceExamId) return

    setLoadingImportQuestions(true)
    const supabase = createClient()
    const collected: any[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', sourceExamId)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) {
        alert(`Gagal memuat soal sumber: ${error.message}`)
        setLoadingImportQuestions(false)
        return
      }
      collected.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
    setImportCandidateQuestions(collected)
    setLoadingImportQuestions(false)
  }

  const handleImportSelectedQuestions = async () => {
    const selected = importCandidateQuestions.filter((question) => selectedImportQuestionIds.includes(question.id))
    if (selected.length === 0) {
      alert('Pilih minimal satu soal yang akan diimpor.')
      return
    }

    const existingTexts = new Set(questions.map((question) => normalizeQuestionText(question.question_text)))
    const duplicateCount = selected.filter((question) => existingTexts.has(normalizeQuestionText(question.question_text))).length
    const toInsert = selected.filter((question) => !existingTexts.has(normalizeQuestionText(question.question_text)))

    if (toInsert.length === 0) {
      alert('Semua soal yang dipilih sudah terdeteksi ada di paket tujuan. Tidak ada soal yang ditambahkan.')
      return
    }

    const confirmation = confirm(
      `Impor ${toInsert.length} soal terpilih ke paket ini?\\n` +
      (duplicateCount > 0 ? `${duplicateCount} soal yang terdeteksi duplikat akan dilewati.\\n` : '') +
      'Soal lama tidak dihapus. Setiap soal baru akan memiliki ID sendiri.'
    )
    if (!confirmation) return

    setImportingSelectedQuestions(true)
    const supabase = createClient()
    const questionColumns = [
      'question_text', 'image_url', 'options', 'correct_option', 'explanation', 'difficulty',
      'question_type', 'max_score', 'correct_answers', 'indicator', 'cognitive_level',
      'target_x', 'target_y', 'maze_width', 'maze_height', 'start_x', 'start_y',
      'obstacles', 'answer_mode', 'correct_answer',
    ]
    const rows = toInsert.map((question) => {
      const copy: Record<string, any> = { exam_id: examId }
      questionColumns.forEach((column) => { copy[column] = question[column] })
      return copy
    })

    const { error } = await supabase.from('questions').insert(rows)
    if (error) {
      alert(`Gagal mengimpor soal: ${error.message}`)
    } else {
      alert(`Berhasil mengimpor ${rows.length} soal. ${duplicateCount} soal duplikat dilewati.`)
      setIsBankImportModalOpen(false)
      setSelectedImportQuestionIds([])
      await fetchExamAndQuestions()
    }
    setImportingSelectedQuestions(false)
  }

  // 🟢 4. HANDLER TOMBOL 3: IMPORT BULK (TEMPLATE MODAL ADAPTIF)
  const getBulkTemplateSample = () => {
    const actType = exam?.activity_type || 'QUIZ'
    if (actType === 'QUIZ') {
      return JSON.stringify(
        [
          {
            question_text: 'Berapakah hasil dari $15 \\times 3 + 20$?',
            options: [
              { key: 'A', text: '55' },
              { key: 'B', text: '65' },
              { key: 'C', text: '75' },
              { key: 'D', text: '85' },
            ],
            correct_option: 'B',
            explanation: 'Perkalian didahulukan: $15 \\times 3 = 45$, lalu $45 + 20 = 65$.',
          },
          {
            question_text: 'Organ tubuh manusia yang menyerap oksigen adalah...',
            options: [
              { key: 'A', text: 'Jantung' },
              { key: 'B', text: 'Paru-paru' },
              { key: 'C', text: 'Hati' },
              { key: 'D', text: 'Ginjal' },
            ],
            correct_option: 'B',
            explanation: 'Paru-paru adalah organ utama sistem pernapasan.',
          },
        ],
        null,
        2
      )
    } else if (actType === 'FLASHCARD') {
      return JSON.stringify(
        [
          {
            question_text: 'Berapakah Rumus Luas Segitiga?',
            explanation: 'Rumus: $L = \\frac{1}{2} \\times a \\times t$.',
          },
          {
            question_text: 'Berapakah Rumus Keliling Persegi?',
            explanation: 'Rumus: $K = 4 \\times s$.',
          },
        ],
        null,
        2
      )
    } else {
      return JSON.stringify(
        [
          {
            question_text: 'Misi Labirin #1: Arahkan Robot ke Bintang di titik (3, 2)!',
            target_x: 3,
            target_y: 2,
            explanation: 'Petunjuk: Gunakan perintah Maju 3x dan Belok Kanan.',
          },
        ],
        null,
        2
      )
    }
  }

  const handleOpenBulkModal = () => {
    setBulkInputText(getBulkTemplateSample())
    setIsBulkModalOpen(true)
  }

  const handleProcessBulkImport = async () => {
    if (!bulkInputText.trim()) {
      alert('Teks JSON impor massal tidak boleh kosong!')
      return
    }

    try {
      const parsedData = JSON.parse(bulkInputText)
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        alert('Format JSON harus berupa Array daftar soal [...]!')
        return
      }

      const actType = exam?.activity_type || 'QUIZ'
      const questionsToInsert = parsedData.map((item: any, idx: number) => {
        let payload: any = {
          exam_id: examId,
          question_text: item.question_text || `Item #${idx + 1}`,
          explanation: item.explanation || item.pembahasan || '',
          image_url: item.image_url || null,
        }

        if (actType === 'QUIZ') {
          payload.options = Array.isArray(item.options) ? item.options : []
          payload.correct_option = String(item.correct_option || item.correct_answer || 'A').toUpperCase()
        } else if (actType === 'MAZE_GAME') {
          payload.options = []
          payload.correct_option = 'FORWARD'
          payload.target_x = Number(item.target_x ?? 3)
          payload.target_y = Number(item.target_y ?? 3)
        } else if (actType === 'FLASHCARD') {
          payload.options = []
          payload.correct_option = 'A'
        }

        return payload
      })

      const supabase = createClient()
      const { error } = await supabase.from('questions').insert(questionsToInsert)

      if (error) {
        alert(`Gagal Impor Bulk: ${error.message}`)
      } else {
        alert(`🎉 Berhasil mengimpor ${questionsToInsert.length} item baru sekaligus!`)
        setIsBulkModalOpen(false)
        fetchExamAndQuestions()
      }
    } catch (err: any) {
      alert(`⚠️ Format JSON tidak valid! Pastikan tanda petik dan koma sudah benar.\n\nDetail Error: ${err.message}`)
    }
  }

  // Quick Edit: hanya memperbarui kolom yang ditampilkan; kolom khusus lain tetap utuh.
  const handleOpenQuickEdit = (question: any) => {
    const options = Array.isArray(question.options) ? JSON.parse(JSON.stringify(question.options)) : []
    const type = question.question_type || 'multiple_choice'
    const correctAnswers = question.correct_answers
    const selectedKeys = Array.isArray(correctAnswers)
      ? correctAnswers.map(String)
      : String(question.correct_option || '').split(',').map((value: string) => value.trim()).filter(Boolean)

    setQuickEditQuestion(question)
    setQuickEditData({
      question_text: question.question_text || '',
      image_url: question.image_url || '',
      options,
      correct_option: question.correct_option || 'A',
      selected_keys: selectedKeys,
      matrix_answers: correctAnswers && !Array.isArray(correctAnswers) ? { ...correctAnswers } : {},
      explanation: question.explanation || '',
      max_score: question.max_score ?? 1,
      indicator: question.indicator || '',
      cognitive_level: question.cognitive_level || 'MOTS',
      question_type: type,
    })
    setIsQuickEditOpen(true)
  }

  const handleSaveQuickEdit = async () => {
    if (!quickEditQuestion || !quickEditData || quickEditSaving) return
    const plainText = String(quickEditData.question_text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim()
    if (!plainText && !/<img\b/i.test(quickEditData.question_text || '')) {
      alert('Teks pertanyaan wajib diisi.')
      return
    }
    const score = Number(quickEditData.max_score)
    if (!Number.isFinite(score) || score <= 0) {
      alert('Skor maksimum harus berupa angka lebih dari 0.')
      return
    }

    const type = quickEditData.question_type
    const payload: any = {
      question_text: quickEditData.question_text,
      image_url: String(quickEditData.image_url || '').trim() || null,
      explanation: quickEditData.explanation || null,
      max_score: score,
      indicator: String(quickEditData.indicator || '').trim() || null,
      cognitive_level: quickEditData.cognitive_level || 'MOTS',
    }

    if (['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(type)) {
      payload.options = quickEditData.options
    }
    if (type === 'multiple_choice') {
      payload.correct_option = quickEditData.correct_option
      payload.correct_answers = [quickEditData.correct_option]
    } else if (type === 'complex_multiple_choice') {
      const keys = quickEditData.selected_keys || []
      if (keys.length === 0) {
        alert('Pilih minimal satu kunci jawaban benar.')
        return
      }
      payload.correct_option = keys.join(',')
      payload.correct_answers = keys
    } else if (type === 'true_false_matrix') {
      const answers = quickEditData.matrix_answers || {}
      const missing = quickEditData.options.filter((option: any, index: number) => !answers[String(option.id ?? index + 1)])
      if (missing.length > 0) {
        alert('Tentukan Benar atau Salah untuk setiap pernyataan pada matriks.')
        return
      }
      payload.correct_answers = answers
      payload.correct_option = 'MATRIX'
    }

    setQuickEditSaving(true)
    try {
      const supabase = createClient()
      const targetMode = exam?.target_mode || 'BOTH'
      let examAnswerCount = 0
      let practiceAnswerCount = 0

      if (targetMode !== 'PRACTICE_ONLY') {
        const { count, error } = await supabase
          .from('answers')
          .select('id', { count: 'exact', head: true })
          .eq('question_id', quickEditQuestion.id)
        if (error) throw new Error(`Tidak dapat memeriksa riwayat ujian: ${error.message}`)
        examAnswerCount = count || 0
      }

      if (targetMode !== 'EXAM_ONLY') {
        const { count, error } = await supabase
          .from('practice_attempt_answers')
          .select('id', { count: 'exact', head: true })
          .eq('question_id', quickEditQuestion.id)
        if (error) throw new Error(`Tidak dapat memeriksa riwayat latihan: ${error.message}`)
        practiceAnswerCount = count || 0
      }

      const totalHistoricalAnswers = examAnswerCount + practiceAnswerCount
      if (totalHistoricalAnswers > 0) {
        const historySummary = [
          examAnswerCount > 0 ? `${examAnswerCount} jawaban ujian` : '',
          practiceAnswerCount > 0 ? `${practiceAnswerCount} jawaban latihan` : '',
        ].filter(Boolean).join(' dan ')
        const proceed = confirm(
          `Soal ini sudah memiliki ${historySummary}.\\n\\n` +
          'Perubahan isi, kunci, atau skor tidak menghapus jawaban dan nilai tersimpan, tetapi dapat memengaruhi penilaian jika jawaban dihitung ulang di kemudian hari. Lanjutkan?'
        )
        if (!proceed) return
      }

      const { error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', quickEditQuestion.id)
        .eq('exam_id', examId)
      if (error) throw new Error(`Gagal menyimpan Quick Edit: ${error.message}`)

      alert('Quick Edit berhasil disimpan. Jawaban dan nilai historis tidak diubah.')
      setIsQuickEditOpen(false)
      setQuickEditQuestion(null)
      setQuickEditData(null)
      await fetchExamAndQuestions()
    } catch (error: any) {
      alert(error?.message || 'Terjadi kesalahan saat menyimpan Quick Edit.')
    } finally {
      setQuickEditSaving(false)
    }
  }


  const handleExportDocx = async () => {
    if (isDocxExporting || !questions.length) return
    setIsDocxExporting(true)
    try {
      await exportQuestionPaperDocx({ schoolName: 'SD NEGERI GETASAN', schoolAddress: 'Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774)', title: exam?.title || 'Naskah Soal', instructions: 'Pilihlah jawaban yang paling tepat.', orientation: 'portrait', includeAnswerKey: printSettings.includeAnswerKey, includeExplanations: printSettings.includeExplanations }, questions, exam?.title || 'Naskah Soal', exam?.subtest || 'Mata Pelajaran', exam?.duration_minutes || null)
    } catch (error: any) { alert(error?.message || 'Gagal membuat file Word.') }
    finally { setIsDocxExporting(false) }
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (!hasRichContent(questionText)) {
      setMsg('Error: Teks soal wajib diisi.')
      return
    }

    if (
      (questionType === 'multiple_choice' || questionType === 'complex_multiple_choice') &&
      options.some((option) => !hasRichContent(option.text))
    ) {
      setMsg('Error: Teks semua pilihan jawaban A–D wajib diisi.')
      return
    }

    if (
      questionType === 'true_false_matrix' &&
      statements.some((statement) => !hasRichContent(statement.text))
    ) {
      setMsg('Error: Teks setiap pernyataan wajib diisi.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    let payload: any = {
      exam_id: examId,
      question_type: questionType,
      question_text: questionText,
      image_url: imageUrl.trim() || null,
      max_score: Number(maxScore),
      explanation: hasRichContent(explanation) ? explanation : null,
    }

    if (questionType === 'multiple_choice') {
      payload.options = options
      payload.correct_option = correctSingleOption
      payload.correct_answers = [correctSingleOption]
    } else if (questionType === 'complex_multiple_choice') {
      if (correctComplexOptions.length === 0) {
        setMsg('Error: Pilih minimal 1 kunci jawaban untuk PG Kompleks.')
        setIsSubmitting(false)
        return
      }
      payload.options = options
      payload.correct_option = correctComplexOptions.join(',')
      payload.correct_answers = correctComplexOptions
    } else if (questionType === 'true_false_matrix') {
      if (statements.length === 0) {
        setMsg('Error: Tambahkan minimal 1 pernyataan untuk Matriks.')
        setIsSubmitting(false)
        return
      }
      payload.options = statements
      const answerObj: { [key: string]: string } = {}
      statements.forEach((st) => {
        answerObj[st.id] = st.correct_val
      })
      payload.correct_answers = answerObj
      payload.correct_option = 'MATRIX'
    } else if (questionType === 'essay') {
      payload.options = []
      payload.correct_option = 'ESSAY'
      payload.correct_answers = null
    }

    let error: any = null

    if (editingQuestionId) {
      const res = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editingQuestionId)
      error = res.error
    } else {
      const res = await supabase.from('questions').insert([payload])
      error = res.error
    }

    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg(
        editingQuestionId
          ? 'Soal berhasil diperbarui!'
          : 'Soal baru berhasil ditambahkan!'
      )
      resetForm()
      loadData()
      setActiveTab('list')
    }    setIsSubmitting(false)
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Hapus butir soal ini?')) return
    const supabase = createClient()
    await supabase.from('questions').delete().eq('id', qId)
    setSelectedIds((prev) => prev.filter((id) => id !== qId))
    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">
          Memuat data soal admin...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ATURAN STYLESHEET KHUSUS TAMPILAN CETAK PDF (A4 2 KOLOM + HALAMAN TERPISAH KUNCI & PEMBAHASAN) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 13mm 10mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-family: 'Times New Roman', Times, serif, sans-serif;
          }
          nav,
          header,
          .no-print,
          .print-preview-controls {
            display: none !important;
          }
          .print-preview-overlay {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .print-preview-panel {
            width: auto !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .print-document {
            display: block !important;
            color: black !important;
            background: white !important;
            padding: 0 !important;
          }
          .soal-two-columns {
            column-count: 2;
            column-rule: 1px solid #cbd5e1;
          }
          .soal-one-column {
            column-count: 1;
          }
          .soal-item-print {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .page-break-before {
            break-before: page;
            page-break-before: always;
            column-count: 1 !important;
          }
        }
        @media screen {
          .print-preview-overlay {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            overflow-y: auto;
            padding: 24px;
            background: rgba(15, 23, 42, 0.78);
          }
          .print-preview-panel {
            width: min(1180px, 100%);
            max-height: calc(100vh - 48px);
            overflow: auto;
            padding: 24px;
            border-radius: 16px;
            background: white;
            box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
          }
          .print-document {
            display: block;
            color: black;
            background: white;
            padding: 8px;
          }
          .soal-two-columns {
            column-count: 2;
            column-gap: 20px;
            column-rule: 1px solid #cbd5e1;
          }
          .soal-one-column {
            column-count: 1;
          }
          .soal-item-print { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* BILAH UTAMA (NAVBAR SCREEN BIASA) */}
      <div className="no-print">
        <Navbar />
      </div>

      {/* PENGATURAN DAN PRATINJAU CETAK */}
      {showPrintPreview && (
        <div className="print-preview-overlay">
          <div className="print-preview-panel">
            <div className="print-preview-controls no-print mb-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Pengaturan & Pratinjau Cetak</h2>
                  <p className="text-xs text-slate-500">Periksa tampilan naskah sebelum mencetak atau menyimpan sebagai PDF.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Tutup Pratinjau
                </button>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs font-semibold text-slate-700">Kelas
                    <input type="text" value={printSettings.className} onChange={(e) => setPrintSettings((p) => ({ ...p, className: e.target.value }))} placeholder="Contoh: 2A" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-700">Fase
                    <input type="text" value={printSettings.phase} onChange={(e) => setPrintSettings((p) => ({ ...p, phase: e.target.value }))} placeholder="Contoh: A" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-700">Tata letak soal
                    <select value={printSettings.twoColumns ? '2' : '1'} onChange={(e) => setPrintSettings((p) => ({ ...p, twoColumns: e.target.value === '2' }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                      <option value="2">Dua kolom</option><option value="1">Satu kolom</option>
                    </select>
                  </label>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold text-slate-700">Ukuran dan kerapatan cetak</p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {([
                      ['logoSizeMm', 'Ukuran logo (mm)', 8, 30, 1],
                      ['headerFontSize', 'Font kop (pt)', 7, 16, 0.5],
                      ['identityFontSize', 'Font identitas (pt)', 6, 14, 0.5],
                      ['questionFontSize', 'Font soal (pt)', 8, 16, 0.5],
                      ['lineHeight', 'Spasi baris', 1, 1.6, 0.05],
                      ['questionSpacingMm', 'Jarak soal (mm)', 0, 12, 1],
                      ['columnGapMm', 'Jarak kolom (mm)', 3, 15, 1],
                    ] as const).map(([key, label, min, max, step]) => (
                      <label key={key} className="space-y-1 text-xs font-semibold text-slate-700">{label}
                        <input type="number" min={min} max={max} step={step} value={printSettings[key]} onChange={(e) => setPrintSettings((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal" />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={printSettings.includeAnswerKey} onChange={(e) => setPrintSettings((p) => ({ ...p, includeAnswerKey: e.target.checked }))} className="h-4 w-4" />Sertakan kunci jawaban</label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={printSettings.includeExplanations} disabled={!printSettings.includeAnswerKey} onChange={(e) => setPrintSettings((p) => ({ ...p, includeExplanations: e.target.checked }))} className="h-4 w-4" />Sertakan pembahasan</label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button type="button" disabled={isDocxExporting} onClick={handleExportDocx} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{isDocxExporting ? 'Membuat Word…' : 'Unduh DOCX (Word)'}</button>
                <button
                  type="button"
                  onClick={handlePrintNow}
                  className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  Cetak / Simpan PDF
                </button>
              </div>
            </div>

            {/* DOKUMEN YANG SAMA DIPAKAI UNTUK PRATINJAU DAN HASIL CETAK */}
            <div className="print-document text-black p-1 font-serif" style={{ fontSize: `${printSettings.questionFontSize}pt`, lineHeight: printSettings.lineHeight }}>
        <div className="border-b-2 border-double border-black pb-1.5 mb-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo-sd-getasan.png" alt="Logo SD Negeri Getasan" style={{ width: `${printSettings.logoSizeMm}mm`, height: `${printSettings.logoSizeMm}mm` }} className="shrink-0 object-contain" />
            <div className="text-center" style={{ fontSize: `${printSettings.headerFontSize}pt`, lineHeight: 1.1 }}>
              <p className="font-bold uppercase">PEMERINTAH KABUPATEN SEMARANG</p>
              <p className="font-bold uppercase">DINAS PENDIDIKAN, KEBUDAYAAN, KEPEMUDAAN DAN OLAHRAGA</p>
              <h1 className="font-black uppercase">SD NEGERI GETASAN</h1>
              <p className="italic" style={{ fontSize: `${Math.max(6, printSettings.headerFontSize - 1)}pt` }}>Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774) | Email: sdnegerigetasan@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="mb-2 bg-white border-b border-black pb-1" style={{ fontSize: `${printSettings.identityFontSize}pt` }}>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1">
            <p><b>MATA PELAJARAN:</b> {exam?.subtest || 'MATEMATIKA'}</p>
            <p><b>NAMA UJIAN:</b> {exam?.title}</p>
            <p><b>ALOKASI WAKTU:</b> {exam?.duration_minutes} Menit</p>
            <p><b>JUMLAH SOAL:</b> {questions.length} Butir</p>
            <p className="whitespace-nowrap"><b>NAMA:</b> <span className="inline-block w-24 border-b border-black">&nbsp;</span></p>
            <p className="whitespace-nowrap"><b>KELAS/FASE:</b> <span className="inline-block min-w-12 border-b border-black text-center">{[printSettings.className, printSettings.phase].filter(Boolean).join(' / ') || '\u00a0'}</span></p>
          </div>
        </div>

        {/* PETUNJUK PENGERJAAN */}
        <p className="text-[11px] italic border-b border-black pb-2 mb-3">
          <b>PETUNJUK:</b> Pilihlah satu atau beberapa jawaban yang paling tepat pada lembar jawaban yang telah disediakan!
        </p>

        {/* NASKAH SOAL 2 KOLOM */}
        <div className={`${printSettings.twoColumns ? 'soal-two-columns' : 'soal-one-column'}`} style={{ columnGap: `${printSettings.columnGapMm}mm`, fontSize: `${printSettings.questionFontSize}pt`, lineHeight: printSettings.lineHeight }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="soal-item-print" style={{ marginBottom: `${printSettings.questionSpacingMm}mm` }}>
              <div className="flex items-start space-x-1">
                <span className="font-bold shrink-0">{idx + 1}.</span>
                <div className="space-y-1 w-full">
                  <div className="font-medium text-justify">
                    <MathRenderer content={q.question_text} />
                  </div>

                  {/* GAMBAR SOAL JIKA ADA */}
                  {q.image_url && (
                    <img
                      src={q.image_url}
                      alt="Gambar Soal"
                      className="max-h-36 object-contain rounded my-1 border border-slate-300"
                    />
                  )}

                  {/* OPTION PILIHAN GANDA */}
                  {Array.isArray(q.options) && q.question_type !== 'true_false_matrix' && (
                    <div className="space-y-1 pt-1 pl-1">
                      {q.options.map((opt: any) => (
                        <div key={opt.key} className="flex items-start space-x-1.5">
                          <span className="font-bold">{opt.key}.</span>
                          <span>
                            <MathRenderer content={opt.text} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PERNYATAAN BENAR/SALAH MATRIKS */}
                  {q.question_type === 'true_false_matrix' && Array.isArray(q.options) && (
                    <table className="w-full border-collapse border border-black mt-1" style={{ fontSize: `${printSettings.questionFontSize}pt`, lineHeight: printSettings.lineHeight }}>
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-black p-1 text-left">Pernyataan</th>
                          <th className="border border-black p-1 text-center w-12">Benar</th>
                          <th className="border border-black p-1 text-center w-12">Salah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.options.map((st: any) => (
                          <tr key={st.id}>
                            <td className="border border-black p-1">
                              <MathRenderer content={st.text || ''} />
                            </td>
                            <td className="border border-black p-1 text-center">◯</td>
                            <td className="border border-black p-1 text-center">◯</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="py-2 text-center font-bold" style={{ fontSize: `${printSettings.identityFontSize}pt` }}>☺ Selamat Mengerjakan, Semoga Sukses ☺</div>

        {/* LEMBAR KUNCI JAWABAN DAN PEMBAHASAN (OPSIONAL) */}
        {printSettings.includeAnswerKey && (
        <div className="page-break-before pt-4">
          <div className="text-center border-b-2 border-black pb-2 mb-4">
            <h2 className="text-base font-bold uppercase">
              🔑 KUNCI JAWABAN & PEMBAHASAN SOAL
            </h2>
            <p className="text-xs">
              <b>PAKET UJIAN:</b> {exam?.title} ({exam?.subtest || 'UMUM'})
            </p>
          </div>

          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-2 w-12 text-center">No</th>
                <th className="border border-black p-2 w-28 text-center">Kunci Jawaban</th>
                {printSettings.includeExplanations && (
                  <th className="border border-black p-2 text-left">Pembahasan & Solusi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => {
                let kunciStr = ''
                if (Array.isArray(q.correct_answers)) {
                  kunciStr = q.correct_answers.join(', ')
                } else if (typeof q.correct_option === 'object' && q.correct_option !== null) {
                  kunciStr = Object.entries(q.correct_option)
                    .map(([k, v]) => `#${k}: ${v}`)
                    .join(' | ')
                } else {
                  kunciStr = String(q.correct_option || '-')
                }

                return (
                  <tr key={q.id}>
                    <td className="border border-black p-2 text-center font-bold">
                      {idx + 1}
                    </td>
                    <td className="border border-black p-2 text-center font-bold text-indigo-900">
                      {kunciStr}
                    </td>
                    {printSettings.includeExplanations && (
                      <td className="border border-black p-2 leading-relaxed">
                        {q.explanation ? (
                          <MathRenderer content={q.explanation} />
                        ) : (
                          <span className="italic text-slate-500">Tidak ada pembahasan.</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
            </div>
          </div>
        </div>
      )}

      {/* Halaman Interaktif Web Admin */}
      <main className="no-print p-8 max-w-6xl mx-auto space-y-6">
        {/* HEADER ACTION BAR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                {exam?.subtest || 'SUBTES TKA'}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                🔑 Token Ujian: {exam?.token_code || exam?.token || 'AKTIF'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              ⚙️ Kelola Soal: {exam?.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 📄 1. TOMBOL CETAK FORM LJK */}
            <Link
              href={`/admin/exam/${examId}/ljk-print`}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>📄</span>
              <span>Cetak Form LJK</span>
            </Link>

            {/* 📷 2. TOMBOL SCAN LJK (OMR) */}
            <Link
              href={`/admin/exam/${examId}/ljk-scanner`}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>📷</span>
              <span>Scan LJK (OMR)</span>
            </Link>

            {/* TOMBOL EXPORT EXCEL */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>📊</span>
              <span>Export Excel</span>
            </button>

            {/* TOMBOL EXPORT / CETAK PDF */}
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>🖨️</span>
              <span>Pratinjau & Cetak</span>
            </button>

            {exam?.target_mode !== 'PRACTICE_ONLY' && (
              <button type="button" onClick={handleOpenBankImport} className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl">📥 Import dari Paket Lain</button>
            )}
            {/* IMPORT BULK */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center space-x-1.5"
              suppressHydrationWarning
            >
              <span>📥</span>
              <span>Import Soal (Bulk)</span>
            </button>

            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition-colors"
            >
              ← Dashboard Admin
            </Link>
          </div>
        </div>

        {/* TAB BAR NAVIGASI */}
        <div className="flex border-b border-slate-200 space-x-4">
          <button
            onClick={() => {
              if (activeTab === 'list' && !editingQuestionId) {
                resetForm()
              }
              setActiveTab('form')
            }}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'form'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{editingQuestionId ? '✏️ Edit Soal' : '➕ Tambah Soal Manual'}</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📚 Daftar Soal Aktif ({questions.length})</span>
          </button>
        </div>

        {/* TAB 1: FORM INPUT & EDIT SOAL */}
        {activeTab === 'form' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editingQuestionId ? '✏️ Edit Butir Soal' : '➕ Input Soal Baru'}
              </h2>
              {editingQuestionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  suppressHydrationWarning
                >
                  ✕ Batal Edit
                </button>
              )}
            </div>

            {msg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${                  msg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-5" suppressHydrationWarning>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Tipe Soal TKA
                  </label>
                  <select
                    value={questionType}
                    onChange={(e: any) => setQuestionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  >
                    <option value="multiple_choice">Pilihan Ganda (1 Jawaban Benar)</option>
                    <option value="complex_multiple_choice">Pilihan Ganda Kompleks</option>
                    <option value="true_false_matrix">Matriks (Benar - Salah)</option>
                    <option value="essay">Uraian / Essay (Penilaian Manual Guru)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Bobot Nilai Maksimal
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* EDITOR TEKS SOAL RICH TEXT */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Stimulus / Teks Soal
                </label>
                <RichTextEditor
                  content={questionText}
                  onChange={setQuestionText}
                  placeholder="Tuliskan stimulus atau pertanyaan. Gunakan toolbar untuk format teks, rumus, gambar, Arab, dan Aksara Jawa."
                  minHeight={180}
                />
              </div>

              {imageUrl && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-500">
                    Gambar lama yang tersimpan pada soal
                  </p>
                  <img
                    src={imageUrl}
                    alt="Gambar soal lama"
                    className="max-h-40 max-w-full rounded-lg object-contain"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Gambar ini tetap dipertahankan. Untuk menambahkan gambar baru, gunakan tombol gambar pada editor di atas.
                  </p>
                </div>
              )}

              {/* PILIHAN GANDA BIASA */}
              {questionType === 'multiple_choice' && (
                <div className="space-y-3 pt-3 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci (Pilih 1 Radio)
                  </label>
                  {options.map((opt, idx) => (
                    <div key={opt.key} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correct_single"
                          checked={correctSingleOption === opt.key}
                          onChange={() => setCorrectSingleOption(opt.key)}
                          suppressHydrationWarning
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <div className="flex-1 min-w-0">
                          <RichTextEditor
                            content={opt.text || ''}
                            onChange={(html) => handleOptionChange(idx, 'text', html)}
                            placeholder={`Teks Jawaban Opsi ${opt.key}`}
                            minHeight={90}
                          />
                        </div>
                      </div>
                      {opt.image_url && (
                        <div className="pl-6">
                          <img
                            src={opt.image_url}
                            alt={`Gambar lama opsi ${opt.key}`}
                            className="max-h-28 max-w-full rounded-lg object-contain border border-slate-200 bg-white p-1"
                          />
                          <p className="mt-1 text-[10px] text-slate-500">
                            Gambar lama tetap tersimpan. Gunakan tombol gambar pada editor untuk menambahkan gambar.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* PILIHAN GANDA KOMPLEKS */}
              {questionType === 'complex_multiple_choice' && (
                <div className="space-y-3 pt-3 border-t">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Jawaban & Kunci (Centang Semua Opsi Benar)
                  </label>
                  {options.map((opt, idx) => (
                    <div key={opt.key} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={correctComplexOptions.includes(opt.key)}
                          onChange={() => handleComplexToggle(opt.key)}
                          suppressHydrationWarning
                        />
                        <span className="font-bold text-xs">{opt.key}.</span>
                        <div className="flex-1 min-w-0">
                          <RichTextEditor
                            content={opt.text || ''}
                            onChange={(html) => handleOptionChange(idx, 'text', html)}
                            placeholder={`Teks Jawaban Opsi ${opt.key}`}
                            minHeight={90}
                          />
                        </div>
                      </div>
                      {opt.image_url && (
                        <div className="pl-6">
                          <img
                            src={opt.image_url}
                            alt={`Gambar lama opsi ${opt.key}`}
                            className="max-h-28 max-w-full rounded-lg object-contain border border-slate-200 bg-white p-1"
                          />
                          <p className="mt-1 text-[10px] text-slate-500">
                            Gambar lama tetap tersimpan. Gunakan tombol gambar pada editor untuk menambahkan gambar.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* MATRIKS BENAR - SALAH */}
              {questionType === 'true_false_matrix' && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Daftar Pernyataan & Kunci Jawaban
                    </label>
                    <button
                      type="button"
                      onClick={addStatement}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                      suppressHydrationWarning
                    >
                      + Tambah Pernyataan
                    </button>
                  </div>

                  {statements.map((st, idx) => (
                    <div key={st.id || idx} className="space-y-1 p-3 border rounded-xl bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs w-6 text-center">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <RichTextEditor
                            content={st.text || ''}
                            onChange={(html) => handleStatementChange(idx, 'text', html)}
                            placeholder={`Pernyataan ${idx + 1}`}
                            minHeight={90}
                          />
                        </div>
                        <select
                          value={st.correct_val}
                          onChange={(e) => handleStatementChange(idx, 'correct_val', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-white text-indigo-700"
                          suppressHydrationWarning
                        >
                          <option value="Benar">Benar</option>
                          <option value="Salah">Salah</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeStatement(idx)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
                          suppressHydrationWarning
                        >
                          ✕
                        </button>
                      </div>
                      {st.image_url && (
                        <div className="pl-8">
                          <img
                            src={st.image_url}
                            alt={`Gambar lama pernyataan ${idx + 1}`}
                            className="max-h-28 max-w-full rounded-lg object-contain border border-slate-200 bg-white p-1"
                          />
                          <p className="mt-1 text-[10px] text-slate-500">
                            Gambar lama tetap tersimpan. Gunakan tombol gambar pada editor untuk menambahkan gambar.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* URAIAN / ESSAY */}
              {questionType === 'essay' && (
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">📝 Catatan Soal Uraian / Essay:</p>
                  <p className="leading-relaxed text-[11px]">
                    Siswa akan menjawab dalam bentuk lembar esai teks bebas. Nilai akhir soal ini akan diberikan atau disesuaikan secara manual oleh Guru/Admin di halaman Rekap Nilai Hasil Ujian.
                  </p>
                </div>
              )}

              <details className="pt-3 border-t group">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 hover:bg-amber-100">
                  <span>💡 Pembahasan Soal / Pedoman Penskoran (Opsional)</span>
                  <span className="transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="pt-3 space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Buka bagian ini jika soal memerlukan pembahasan atau pedoman penilaian guru.
                  </p>
                  <RichTextEditor
                    content={explanation}
                    onChange={setExplanation}
                    placeholder="Tuliskan pembahasan atau kata kunci rubrik penilaian di sini..."
                    minHeight={130}
                  />
                </div>
              </details>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 ${
                  editingQuestionId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                suppressHydrationWarning
              >
                {isSubmitting ? 'Menyimpan...' : editingQuestionId ? 'Simpan Perubahan Soal' : 'Tambah Soal Manual'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: DAFTAR SOAL AKTIF (DENGAN CHECKLIST, SORTING, & HAPUS BATCH) */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {/* BILAH KONTROL ATAS: CHECKLIST, BATCH DELETE, SORTING & FILTER */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              {/* SELEKSI CHECKLIST MASSAL & HAPUS */}
              <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
                <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedQuestions.length > 0 &&
                      selectedIds.length === filteredAndSortedQuestions.length
                    }
                    onChange={() => handleToggleSelectAll(filteredAndSortedQuestions)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                  />
                  <span>Pilih Semua ({filteredAndSortedQuestions.length})</span>
                </label>

                {selectedIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1"
                  >
                    <span>🗑️ Hapus Terpilih ({selectedIds.length})</span>
                  </button>
                )}

                <button
                  onClick={handleDeleteAllQuestions}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors"
                  title="Hapus seluruh soal pada ujian ini"
                >
                  ⚠️ Hapus Semua Soal
                </button>
              </div>

              {/* FITUR SORTING & FILTER TIPE SOAL */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-bold text-slate-500">🔀 Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="created_asc">🔢 Nomor (Lama → Baru)</option>
                    <option value="created_desc">🔢 Nomor (Baru → Lama)</option>
                    <option value="type">🏷️ Tipe Soal</option>
                    <option value="score_desc">⭐ Bobot (Terbesar)</option>
                    <option value="score_asc">⭐ Bobot (Terkecil)</option>
                  </select>
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="ALL">🌐 Semua Tipe</option>
                  <option value="multiple_choice">🔘 Pilihan Ganda</option>
                  <option value="complex_multiple_choice">☑️ PG Kompleks</option>
                  <option value="true_false_matrix">📊 Matriks</option>
                  <option value="essay">📝 Essay</option>
                </select>

                <button
                  onClick={() => {
                    resetForm()
                    setActiveTab('form')
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0"
                >
                  + Tambah Soal
                </button>
              </div>
            </div>

            {/* DAFTAR KARTU SOAL AKTIF DENGAN CHECKLIST */}
            {filteredAndSortedQuestions.length > 0 ? (
              filteredAndSortedQuestions.map((q, idx) => {
                const qType = q.question_type || 'multiple_choice'
                const isChecked = selectedIds.includes(q.id)

                return (
                  <div
                    key={q.id}
                    className={`bg-white p-6 rounded-2xl border shadow-sm space-y-3 transition-all ${
                      isChecked
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* BARIS HEADER KARTU SOAL DENGAN CHECKBOX */}
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(q.id)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                        />
                        <span className="font-bold text-indigo-600 text-sm">No. {idx + 1}</span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase">
                          {qType === 'complex_multiple_choice'
                            ? 'PG Kompleks'
                            : qType === 'true_false_matrix'
                            ? 'Matriks'
                            : qType === 'essay'
                            ? 'Uraian / Essay'
                            : 'Pilihan Ganda'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          (Bobot: {q.max_score || 1} Poin)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button type="button" onClick={() => handleOpenQuickEdit(q)} className="text-xs text-cyan-700 hover:text-cyan-900 font-bold bg-cyan-50 px-3 py-1 rounded-lg border border-cyan-200">⚡ Quick Edit</button>
                        <button type="button" onClick={() => handleDuplicateQuestion(q)} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">⧉ Duplikasi</button>
                        <button
                          onClick={() => handleEditClick(q)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-bold bg-amber-50 px-3 py-1 rounded-lg border border-amber-200"
                          suppressHydrationWarning
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
                          suppressHydrationWarning
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="text-slate-800 text-sm font-medium">
                      <MathRenderer content={q.question_text} />
                    </div>

                    {q.image_url && (
                      <div className="my-2">
                        <img src={q.image_url} alt="Gambar Soal" className="max-h-56 rounded-xl border" />
                      </div>
                    )}

                    {/* Pratinjau Opsi PG & PG Kompleks */}
                    {(qType === 'multiple_choice' || qType === 'complex_multiple_choice') &&
                      Array.isArray(q.options) && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-slate-200 text-xs">
                          {q.options.map((opt: any, oIdx: number) => {
                            const optKey = opt.key || String.fromCharCode(65 + oIdx)
                            let isKey = false
                            if (qType === 'multiple_choice') {
                              isKey = String(q.correct_option).trim().toUpperCase() === optKey
                            } else {
                              isKey = Array.isArray(q.correct_answers)
                                ? q.correct_answers.includes(optKey)
                                : String(q.correct_option).includes(optKey)
                            }

                            return (
                              <div
                                key={optKey || oIdx}
                                className={`flex items-start space-x-2 ${
                                  isKey ? 'font-bold text-emerald-700' : 'text-slate-600'
                                }`}
                              >
                                <span className="w-4">{optKey}.</span>
                                <div className="flex-1">
                                  <MathRenderer content={typeof opt === 'string' ? opt : opt.text} />
                                  {opt.image_url && (
                                    <img src={opt.image_url} alt={`Gambar Opsi ${optKey}`} className="max-h-24 mt-1 rounded border" />
                                  )}
                                </div>
                                {isKey && <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Kunci</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                    {/* Pratinjau Pernyataan Matriks */}
                    {qType === 'true_false_matrix' && Array.isArray(q.options) && (
                      <div className="border rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b font-bold text-slate-700">
                            <tr>
                              <th className="p-2.5">Pernyataan</th>
                              <th className="p-2.5 w-24 text-center border-l">Kunci</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {q.options.map((st: any, sIdx: number) => {
                              const keyVal = q.correct_answers?.[st.id] || st.correct_val || 'Benar'
                              return (
                                <tr key={st.id || sIdx}>
                                  <td className="p-2.5">
                                    <MathRenderer content={typeof st === 'string' ? st : st.text} />
                                    {st.image_url && (
                                      <img src={st.image_url} alt="Gambar Pernyataan" className="max-h-20 mt-1 rounded border" />
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center border-l font-bold text-indigo-700">
                                    {keyVal}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pratinjau Essay */}
                    {qType === 'essay' && (
                      <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600 space-y-1">
                        <span className="font-bold text-slate-800 block">Rubrik / Pedoman Guru:</span>
                        <p>{q.explanation || 'Tidak ada pedoman penskoran khusus.'}</p>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
                Belum ada soal pada ujian ini.
              </div>
            )}
          </div>
        )}
      </main>

      {isBankImportModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-950 border border-slate-800 max-w-4xl w-full rounded-3xl p-5 sm:p-6 space-y-4 text-white shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div>
                <h2 className="text-sm font-black">📥 Pilih Soal dari Paket Lain</h2>
                <p className="text-[11px] text-slate-400 mt-1">Pilih paket sumber, periksa pratinjau, lalu centang soal yang ingin ditambahkan.</p>
              </div>
              <button type="button" onClick={() => setIsBankImportModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Paket sumber</label>
                <select value={selectedImportExamId} onChange={(e) => handleSelectImportSource(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  <option value="">Pilih paket sumber…</option>
                  {importSourceExams.map((source) => (
                    <option key={source.id} value={source.id}>{source.title} — {source.subtest || 'Tanpa subtes'}</option>
                  ))}
                </select>
                {loadingImportSources && <p className="text-[11px] text-slate-400 mt-1">Memuat daftar paket…</p>}
                {!loadingImportSources && importSourceExams.length === 0 && <p className="text-[11px] text-amber-300 mt-1">Tidak ada paket Quiz yang sesuai untuk sistem ini.</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cari soal dalam paket</label>
                <input value={importSearchTerm} onChange={(e) => setImportSearchTerm(e.target.value)} placeholder="Cari teks pertanyaan…" className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{importCandidateQuestions.length} soal tersedia</span>
              <span>{selectedImportQuestionIds.length} dipilih</span>
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 space-y-2 pr-1">
              {loadingImportQuestions ? (
                <p className="text-center text-xs text-slate-400 py-8">Memuat soal dari paket sumber…</p>
              ) : !selectedImportExamId ? (
                <p className="text-center text-xs text-slate-500 py-8">Pilih paket sumber untuk melihat soal.</p>
              ) : importCandidateQuestions.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">Paket sumber belum memiliki soal.</p>
              ) : importCandidateQuestions
                .filter((question) => normalizeQuestionText(question.question_text).includes(importSearchTerm.trim().toLowerCase()))
                .map((question, index) => {
                  const isDuplicate = questions.some((current) => normalizeQuestionText(current.question_text) === normalizeQuestionText(question.question_text))
                  const isChecked = selectedImportQuestionIds.includes(question.id)
                  return (
                    <label key={question.id} className={`block p-3 rounded-xl border ${isDuplicate ? 'border-amber-900/70 bg-amber-950/20 opacity-80' : isChecked ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/70'} cursor-pointer`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={isChecked} disabled={isDuplicate || importingSelectedQuestions} onChange={(e) => setSelectedImportQuestionIds((current) => e.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} className="mt-1 accent-cyan-500" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                            <span className="text-cyan-300">Soal #{index + 1}</span>
                            <span className="text-slate-400">{question.question_type || 'multiple_choice'}</span>
                            {isDuplicate && <span className="text-amber-300">Sudah ada di paket tujuan</span>}
                            {!isDuplicate && <span className="text-emerald-300">Siap diimpor</span>}
                          </div>
                          <div className="text-xs text-slate-100 leading-relaxed"><MathRenderer content={question.question_text || '(Pertanyaan kosong)'} className="flow-root" normalizeRotatedImages /></div>
                          {question.image_url && <img src={question.image_url} alt="Pratinjau gambar soal" className="max-h-24 max-w-full rounded-lg border border-slate-700 object-contain" />}
                          {Array.isArray(question.options) && question.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                              {question.options.map((option: any, optionIndex: number) => (
                                <div key={option.key || optionIndex} className="text-[10px] text-slate-400 truncate">{option.key || String.fromCharCode(65 + optionIndex)}. {typeof option === 'string' ? option : option.text || option.title || ''}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">Soal yang terdeteksi sama berdasarkan teks pertanyaan tidak dapat dipilih ulang.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsBankImportModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Batal</button>
                <button type="button" onClick={handleImportSelectedQuestions} disabled={importingSelectedQuestions || selectedImportQuestionIds.length === 0} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl">{importingSelectedQuestions ? 'Mengimpor…' : `Impor ${selectedImportQuestionIds.length} Soal`}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ PRATINJAU NASKAH SOAL DAN CETAK / SIMPAN PDF */}
      {isPaperPreviewOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <style jsx global>{`
            @page { size: A4 ${paperSettings.orientation}; margin: 15mm; }
            @media print {
              html, body { background: #fff !important; }
              body * { visibility: hidden !important; }
              #question-paper-print-area, #question-paper-print-area * { visibility: visible !important; }
              #question-paper-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #111 !important; box-shadow: none !important; }
              .question-paper-no-print { display: none !important; }
              .question-paper-item { break-inside: avoid; page-break-inside: avoid; }
              .question-paper-option { break-inside: avoid; page-break-inside: avoid; }
            }
          `}</style>
          <div className="w-full max-w-7xl max-h-[96vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="question-paper-no-print w-full lg:w-80 shrink-0 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-700 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-white">Pengaturan Naskah Soal</h2>
                <button type="button" onClick={() => setIsPaperPreviewOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama sekolah</label>
                <input value={paperSettings.schoolName} onChange={(e) => setPaperSettings((current) => ({ ...current, schoolName: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Alamat sekolah</label>
                <textarea value={paperSettings.schoolAddress} onChange={(e) => setPaperSettings((current) => ({ ...current, schoolAddress: e.target.value }))} rows={2} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Judul naskah</label>
                <input value={paperSettings.title} onChange={(e) => setPaperSettings((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Petunjuk pengerjaan</label>
                <textarea value={paperSettings.instructions} onChange={(e) => setPaperSettings((current) => ({ ...current, instructions: e.target.value }))} rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Orientasi kertas</label>
                <select value={paperSettings.orientation} onChange={(e) => setPaperSettings((current) => ({ ...current, orientation: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white">
                  <option value="portrait">Potret</option><option value="landscape">Lanskap</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={paperSettings.includeAnswerKey} onChange={(e) => setPaperSettings((current) => ({ ...current, includeAnswerKey: e.target.checked, includeExplanations: e.target.checked ? current.includeExplanations : false }))} className="accent-emerald-500" /> Sertakan kunci jawaban (naskah guru)</label>
              {paperSettings.includeAnswerKey && <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={paperSettings.includeExplanations} onChange={(e) => setPaperSettings((current) => ({ ...current, includeExplanations: e.target.checked }))} className="accent-emerald-500" /> Sertakan pembahasan</label>}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" onClick={() => setIsPaperPreviewOpen(false)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">Tutup</button>
                <button type="button" onClick={() => window.print()} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Cetak / PDF</button>
                <button type="button" disabled={isDocxExporting} onClick={handleExportDocx} className="col-span-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold">{isDocxExporting ? 'Membuat Word…' : '⬇ Unduh DOCX (Word)'}</button>
              </div>
              <p className="text-[10px] text-slate-500">Pada dialog cetak perangkat, pilih “Simpan sebagai PDF” untuk menyimpan berkas PDF.</p>
              <p className="text-[10px] text-slate-500">DOCX dapat diedit di Word. Rumus ditulis sebagai teks matematika linear; gambar disematkan jika sumber gambar mengizinkan akses. Tabel dan teks Arab tetap disertakan.</p>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-700 p-3 sm:p-5">
              <article id="question-paper-print-area" className="max-w-[210mm] mx-auto bg-white text-slate-900 shadow-xl p-8 sm:p-10 font-serif text-[11pt] leading-relaxed">
                <header className="text-center border-b-2 border-slate-900 pb-3 mb-5">
                  <h2 className="font-black text-base uppercase tracking-wide">{paperSettings.schoolName || 'Nama Sekolah'}</h2>
                  {paperSettings.schoolAddress && <p className="text-[9pt]">{paperSettings.schoolAddress}</p>}
                  <div className="border-t border-slate-400 mt-3 pt-3">
                    <h1 className="font-black text-lg uppercase">{paperSettings.title || exam?.title}</h1>
                    <p className="text-[10pt]">{exam?.subtest || 'Mata Pelajaran'} · {questions.length} Soal · Waktu {exam?.duration_minutes || '—'} menit</p>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10pt] mb-4">
                  <div>Nama: ................................................................................</div><div>Kelas: ....................................</div>
                  <div>Nomor: ............................................................</div><div>Tanggal: ..................................</div>
                </div>
                <div className="border border-slate-400 p-3 mb-5 text-[10pt]">
                  <strong>Petunjuk:</strong> {paperSettings.instructions}
                </div>

                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const type = question.question_type || 'multiple_choice'
                    const options = Array.isArray(question.options) ? question.options : []
                    const correctAnswers = question.correct_answers
                    const answerLabel = type === 'true_false_matrix'
                      ? (correctAnswers && typeof correctAnswers === 'object' ? Object.entries(correctAnswers).map(([key, value]) => `${key}: ${value}`).join('; ') : '')
                      : Array.isArray(correctAnswers) ? correctAnswers.join(', ') : String(question.correct_answer || question.correct_option || '')
                    return (
                      <section key={question.id} className="question-paper-item text-[10.5pt]">
                        <div className="flex gap-2">
                          <strong className="shrink-0">{index + 1}.</strong>
                          <div className="min-w-0 flex-1">
                            <MathRenderer content={question.question_text || ''} className="flow-root" normalizeRotatedImages />
                            {question.image_url && <img src={question.image_url} alt="Ilustrasi soal" className="max-h-52 max-w-full object-contain my-2" />}
                            {options.length > 0 && type !== 'true_false_matrix' && (
                              <div className="mt-2 ml-1 space-y-1">
                                {options.map((option: any, optionIndex: number) => {
                                  const key = String(option.key ?? String.fromCharCode(65 + optionIndex))
                                  const value = typeof option === 'string' ? option : option.text || option.title || ''
                                  return <div key={key} className="question-paper-option flex gap-2"><span className="shrink-0">{key}.</span><div className="min-w-0"><MathRenderer content={value} className="flow-root" normalizeRotatedImages />{option?.image_url && <img src={option.image_url} alt={`Gambar pilihan ${key}`} className="max-h-28 max-w-full object-contain my-1" />}</div></div>
                                })}
                              </div>
                            )}
                            {type === 'true_false_matrix' && (
                              <table className="w-full border-collapse border border-slate-500 mt-2 text-[9.5pt]"><tbody>
                                {options.map((option: any, optionIndex: number) => <tr key={String(option.id ?? optionIndex)}><td className="border border-slate-500 p-2"><MathRenderer content={option.text || ''} className="flow-root" normalizeRotatedImages />{option.image_url && <img src={option.image_url} alt={`Gambar pernyataan ${optionIndex + 1}`} className="max-h-24 max-w-full object-contain mt-1" />}</td><td className="border border-slate-500 p-2 w-16 text-center">Benar</td><td className="border border-slate-500 p-2 w-16 text-center">Salah</td></tr>)}
                              </tbody></table>
                            )}
                            {type === 'essay' && <div className="mt-2 space-y-5"><div className="border-b border-slate-400" /><div className="border-b border-slate-400" /><div className="border-b border-slate-400" /></div>}
                            {paperSettings.includeAnswerKey && (
                              <div className="mt-2 text-[9pt] text-slate-700"><strong>Kunci:</strong> {answerLabel || 'Belum diisi'}{paperSettings.includeExplanations && question.explanation && <div className="mt-1"><strong>Pembahasan:</strong> <MathRenderer content={question.explanation} className="flow-root" normalizeRotatedImages /></div>}</div>
                            )}
                          </div>
                        </div>
                      </section>
                    )
                  })}
                </div>
                <footer className="mt-8 pt-3 border-t border-slate-400 text-center text-[8pt] text-slate-500">{paperSettings.schoolName} · {exam?.title}</footer>
              </article>
            </div>
          </div>
        </div>
      )}


      {/* ⚡ QUICK EDIT: UPDATE TERBATAS, MENJAGA KOLOM LAIN */}
      {isQuickEditOpen && quickEditData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[65]">
          <div className="bg-slate-950 border border-cyan-900/60 max-w-3xl w-full rounded-3xl p-5 sm:p-6 space-y-4 text-white shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-black text-cyan-200">⚡ Quick Edit Soal</h2>
                <p className="text-[11px] text-slate-400 mt-1">Mengubah bagian terpilih tanpa mengganti kolom khusus atau menghapus riwayat jawaban.</p>
              </div>
              <button type="button" disabled={quickEditSaving} onClick={() => setIsQuickEditOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-2">Teks pertanyaan</label>
                <RichTextEditor content={quickEditData.question_text} onChange={(html) => setQuickEditData((current: any) => ({ ...current, question_text: html }))} placeholder="Perbaiki teks pertanyaan…" minHeight={130} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">URL gambar tambahan</label>
                <input value={quickEditData.image_url} onChange={(e) => setQuickEditData((current: any) => ({ ...current, image_url: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" placeholder="https://…" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Skor maksimum</label>
                <input type="number" min="0.01" step="0.01" value={quickEditData.max_score} onChange={(e) => setQuickEditData((current: any) => ({ ...current, max_score: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Indikator soal</label>
                <input value={quickEditData.indicator} onChange={(e) => setQuickEditData((current: any) => ({ ...current, indicator: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" placeholder="Indikator pembelajaran…" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Level kognitif</label>
                <select value={quickEditData.cognitive_level} onChange={(e) => setQuickEditData((current: any) => ({ ...current, cognitive_level: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  {['LOTS', 'MOTS', 'HOTS', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
            </div>

            {['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(quickEditData.question_type) && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <h3 className="text-xs font-bold text-slate-200">Pilihan / pernyataan</h3>
                {quickEditData.options.map((option: any, index: number) => {
                  const key = String(option.key ?? option.id ?? String.fromCharCode(65 + index))
                  const label = option.text ?? option.title ?? (typeof option === 'string' ? option : '')
                  return (
                    <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                      <div className="text-[10px] font-bold text-cyan-300">{quickEditData.question_type === 'true_false_matrix' ? `Pernyataan ${key}` : `Pilihan ${key}`}</div>
                      <RichTextEditor content={label} onChange={(html) => setQuickEditData((current: any) => ({ ...current, options: current.options.map((item: any, itemIndex: number) => itemIndex === index ? (typeof item === 'string' ? html : { ...item, text: html }) : item) }))} minHeight={75} placeholder="Isi pilihan/pernyataan…" />
                      {quickEditData.question_type === 'true_false_matrix' && (
                        <select value={quickEditData.matrix_answers[key] || ''} onChange={(e) => setQuickEditData((current: any) => ({ ...current, matrix_answers: { ...current.matrix_answers, [key]: e.target.value } }))} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white">
                          <option value="">Pilih kunci…</option><option value="Benar">Benar</option><option value="Salah">Salah</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {quickEditData.question_type === 'multiple_choice' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kunci jawaban</label>
                <select value={quickEditData.correct_option} onChange={(e) => setQuickEditData((current: any) => ({ ...current, correct_option: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  {quickEditData.options.map((option: any, index: number) => {
                    const key = String(option.key ?? String.fromCharCode(65 + index))
                    return <option key={key} value={key}>Pilihan {key}</option>
                  })}
                </select>
              </div>
            )}
            {quickEditData.question_type === 'complex_multiple_choice' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">Kunci jawaban (boleh lebih dari satu)</label>
                <div className="flex flex-wrap gap-3">
                  {quickEditData.options.map((option: any, index: number) => {
                    const key = String(option.key ?? String.fromCharCode(65 + index))
                    return <label key={key} className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={quickEditData.selected_keys.includes(key)} onChange={(e) => setQuickEditData((current: any) => ({ ...current, selected_keys: e.target.checked ? [...current.selected_keys, key] : current.selected_keys.filter((item: string) => item !== key) }))} className="accent-cyan-500" />{key}</label>
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs font-bold text-slate-300 mb-2">Pembahasan / penjelasan</label>
              <RichTextEditor content={quickEditData.explanation} onChange={(html) => setQuickEditData((current: any) => ({ ...current, explanation: html }))} placeholder="Perbaiki pembahasan…" minHeight={110} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">Riwayat jawaban dan nilai tidak dihapus atau dihitung ulang otomatis.</p>
              <div className="flex gap-2">
                <button type="button" disabled={quickEditSaving} onClick={() => setIsQuickEditOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Batal</button>
                <button type="button" disabled={quickEditSaving} onClick={handleSaveQuickEdit} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl">{quickEditSaving ? 'Menyimpan…' : 'Simpan Quick Edit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}


      <BulkUploadModal
        examId={examId}        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}

export default function ExamQuestionManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat manajer soal admin...</p>
        </div>
      }
    >
      <QuestionManagerContent />
    </Suspense>
  )
}