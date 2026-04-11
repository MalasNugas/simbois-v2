import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Users, BookOpen, Briefcase, MapPin, Plus, CheckCircle, XCircle, Filter, Search, Pencil, Trash2, FileText, Bell, Download, Upload, ScrollText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImipas from '@/assets/Logo_IMIPAS.png';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ClientMapView from '@/components/ClientMapView';
import StatistikDashboard from '@/components/StatistikDashboard';

export default function PegawaiDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [showOnlyMyClients, setShowOnlyMyClients] = useState(true);
  const [filterClientStatus, setFilterClientStatus] = useState('all');
  const [filterGuidanceStatus, setFilterGuidanceStatus] = useState('all');
  const [filterEmploymentStatus, setFilterEmploymentStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProgram, setNewProgram] = useState({
    name: '', description: '', program_type: 'kepribadian', quota: 20, schedule_date: '',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [terminationReports, setTerminationReports] = useState<any[]>([]);
  const [terminationDialogOpen, setTerminationDialogOpen] = useState(false);
  const [terminationClient, setTerminationClient] = useState<any>(null);
  const [terminationNotes, setTerminationNotes] = useState('');
  const [terminationFile, setTerminationFile] = useState<File | null>(null);
  const [uploadingTermination, setUploadingTermination] = useState(false);
  const [laporanDialogOpen, setLaporanDialogOpen] = useState(false);
  const [laporanClient, setLaporanClient] = useState<any>(null);
  const [laporanForm, setLaporanForm] = useState({
    agama: 'Islam',
    jenis_bimbingan: 'Kepribadian dan Pengawasan',
    bimbingan_ke: '1',
    tanggal_pelaksanaan: '',
    jam_mulai: '',
    jam_selesai: '',
    tempat: '',
    judul_materi: '',
    isi_materi: '',
    kepala_nama: '',
    status_klien: 'CUTI BERSYARAT',
    nomor_surat: '',
  });
  const [suratPengakhiranDialogOpen, setSuratPengakhiranDialogOpen] = useState(false);
  const [suratPengakhiranClient, setSuratPengakhiranClient] = useState<any>(null);
  const [suratPengakhiranForm, setSuratPengakhiranForm] = useState({
    nomor_surat: '',
    alasan_pengakhiran: 'Selesai masa bimbingan',
    nomor_sk: '',
    perihal_sk: 'Cuti Bersyarat Narapidana',
    tanggal_sk: '',
    kepala_nama: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const terminationFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [clientsRes, programsRes, regsRes, termRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      supabase.from('program_registrations').select('*, programs(*)'),
      supabase.from('termination_reports' as any).select('*'),
    ]);

    const clientsData = clientsRes.data || [];
    if (clientsData.length > 0) {
      const userIds = clientsData.map(c => c.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      clientsData.forEach(c => { (c as any).profile = profileMap.get(c.user_id) || null; });
    }

    const regsData = regsRes.data || [];
    if (regsData.length > 0) {
      const clientIds = regsData.map(r => r.client_id);
      const { data: regProfiles } = await supabase.from('profiles').select('*').in('user_id', clientIds);
      const regProfileMap = new Map((regProfiles || []).map(p => [p.user_id, p]));
      regsData.forEach(r => { (r as any).client_profile = regProfileMap.get(r.client_id) || null; });
    }

    setClients(clientsData);
    setPrograms(programsRes.data || []);
    setRegistrations(regsData);
    setTerminationReports((termRes.data as any[]) || []);
  };

  const uploadPdf = async (file: File): Promise<string | null> => {
    if (file.type !== 'application/pdf') { toast.error('Hanya file PDF yang diizinkan'); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return null; }
    setUploadingPdf(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('program-files').upload(fileName, file);
    setUploadingPdf(false);
    if (error) { toast.error('Gagal upload: ' + error.message); return null; }
    const { data: urlData } = supabase.storage.from('program-files').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const displayedClients = clients
    .filter(c => !c.assigned_pk_id || c.assigned_pk_id === user?.id)
    .filter(c => !showOnlyMyClients || c.assigned_pk_id === user?.id)
    .filter(c => filterClientStatus === 'all' || (c.client_status || 'aktif') === filterClientStatus)
    .filter(c => filterGuidanceStatus === 'all' || (c.guidance_status || 'aktif') === filterGuidanceStatus)
    .filter(c => filterEmploymentStatus === 'all' || (c.employment_status || 'belum_bekerja') === filterEmploymentStatus)
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const name = ((c as any).profile?.full_name || '').toLowerCase();
      const caseNum = (c.case_number || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return name.includes(q) || caseNum.includes(q);
    });

  const clientsWithEndedGuidance = displayedClients.filter(c => {
    if (!c.guidance_end || c.guidance_status !== 'aktif') return false;
    return new Date(c.guidance_end) <= new Date();
  });

  const clientStatusLabel: Record<string, string> = {
    aktif: 'Aktif', meninggal: 'Meninggal', di_luar_wilayah: 'Di Luar Wilayah',
  };

  const stats = {
    total: displayedClients.length,
    aktifBimbingan: displayedClients.filter(c => c.guidance_status === 'aktif').length,
    sudahBekerja: displayedClients.filter(c => c.employment_status === 'sudah_bekerja').length,
    belumBekerja: displayedClients.filter(c => c.employment_status === 'belum_bekerja').length,
  };

  const exportToPdf = () => {
    const guidanceLabel: Record<string, string> = { aktif: 'Aktif', selesai: 'Selesai', tidak_aktif: 'Tidak Aktif' };
    const employmentLabel: Record<string, string> = { belum_bekerja: 'Belum Bekerja', sedang_pelatihan: 'Sedang Pelatihan', sudah_bekerja: 'Sudah Bekerja' };
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Laporan Data Klien', 14, 15);
    doc.setFontSize(9);
    doc.text(`Tanggal: ${format(new Date(), 'dd/MM/yyyy')}  |  Jumlah: ${displayedClients.length} klien`, 14, 22);
    const head = [['No', 'Nama', 'No. Litmas', 'Status Klien', 'Status Bimbingan', 'Status Pekerjaan', 'Mulai', 'Akhir', 'Telepon', 'Alamat']];
    const body = displayedClients.map((c, i) => [
      i + 1,
      (c as any).profile?.full_name || '-',
      c.case_number || '-',
      clientStatusLabel[c.client_status || 'aktif'] || c.client_status || '-',
      guidanceLabel[c.guidance_status || 'aktif'] || c.guidance_status || '-',
      employmentLabel[c.employment_status || 'belum_bekerja'] || c.employment_status || '-',
      c.guidance_start ? format(new Date(c.guidance_start), 'dd/MM/yyyy') : '-',
      c.guidance_end ? format(new Date(c.guidance_end), 'dd/MM/yyyy') : '-',
      (c as any).profile?.phone || '-',
      (c as any).profile?.address || '-',
    ]);
    autoTable(doc, { head, body, startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [41, 128, 185] } });
    doc.save(`data_klien_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Data berhasil di-export ke PDF');
  };

  const updateClientStatus = async (userId: string, status: string) => {
    const { error } = await supabase.from('clients').update({ client_status: status } as any).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Status klien diperbarui'); loadData(); }
  };

  const endGuidance = async (userId: string) => {
    const { error } = await supabase.from('clients').update({ guidance_status: 'selesai' as any }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Masa bimbingan klien telah diakhiri'); loadData(); }
  };

  const openTerminationDialog = (client: any) => {
    setTerminationClient(client);
    setTerminationNotes('');
    setTerminationFile(null);
    setEditingTermReportId(null);
    if (terminationFileRef.current) terminationFileRef.current.value = '';
    setTerminationDialogOpen(true);
  };

  const submitTerminationReport = async () => {
    if (!terminationClient) return;
    setUploadingTermination(true);

    let fileUrl: string | null = null;
    if (terminationFile) {
      if (terminationFile.type !== 'application/pdf') {
        toast.error('Hanya file PDF yang diizinkan');
        setUploadingTermination(false);
        return;
      }
      if (terminationFile.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        setUploadingTermination(false);
        return;
      }
      const fileName = `${Date.now()}-${terminationFile.name}`;
      const { error: uploadError } = await supabase.storage.from('termination-files').upload(fileName, terminationFile);
      if (uploadError) {
        toast.error('Gagal upload file: ' + uploadError.message);
        setUploadingTermination(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('termination-files').getPublicUrl(fileName);
      fileUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from('termination_reports' as any).insert({
      client_id: terminationClient.user_id,
      pegawai_id: user!.id,
      notes: terminationNotes || null,
      file_url: fileUrl,
    });
    setUploadingTermination(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Laporan pengakhiran berhasil dibuat');
    setTerminationDialogOpen(false);
    loadData();
  };

  const [editingTermReportId, setEditingTermReportId] = useState<string | null>(null);

  const openEditTerminationDialog = (client: any, report: any) => {
    setTerminationClient(client);
    setTerminationNotes(report.notes || '');
    setTerminationFile(null);
    setEditingTermReportId(report.id);
    if (terminationFileRef.current) terminationFileRef.current.value = '';
    setTerminationDialogOpen(true);
  };

  const updateTerminationReport = async () => {
    if (!terminationClient || !editingTermReportId) return;
    setUploadingTermination(true);
    const updates: any = { notes: terminationNotes || null };
    if (terminationFile) {
      if (terminationFile.type !== 'application/pdf') { toast.error('Hanya file PDF'); setUploadingTermination(false); return; }
      const fileName = `${Date.now()}-${terminationFile.name}`;
      const { error: uploadError } = await supabase.storage.from('termination-files').upload(fileName, terminationFile);
      if (uploadError) { toast.error('Gagal upload: ' + uploadError.message); setUploadingTermination(false); return; }
      const { data: urlData } = supabase.storage.from('termination-files').getPublicUrl(fileName);
      updates.file_url = urlData.publicUrl;
    }
    const { error } = await supabase.from('termination_reports' as any).update(updates).eq('id', editingTermReportId);
    setUploadingTermination(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Laporan pengakhiran berhasil diperbarui');
    setTerminationDialogOpen(false);
    setEditingTermReportId(null);
    loadData();
  };

  const deleteTerminationReport = async (reportId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus laporan pengakhiran ini?')) return;
    const { error } = await supabase.from('termination_reports' as any).delete().eq('id', reportId);
    if (error) { toast.error(error.message); return; }
    toast.success('Laporan pengakhiran berhasil dihapus');
    loadData();
  };

  const openLaporanDialog = (client: any) => {
    setLaporanClient(client);
    setLaporanForm({
      agama: 'Islam',
      jenis_bimbingan: 'Kepribadian dan Pengawasan',
      bimbingan_ke: '1',
      tanggal_pelaksanaan: format(new Date(), 'yyyy-MM-dd'),
      jam_mulai: '09:00',
      jam_selesai: '10:00',
      tempat: (client as any).profile?.address || '',
      judul_materi: '',
      isi_materi: '',
      kepala_nama: '',
      status_klien: 'CUTI BERSYARAT',
      nomor_surat: '',
    });
    setLaporanDialogOpen(true);
  };

  const openSuratPengakhiranDialog = (client: any) => {
    setSuratPengakhiranClient(client);
    setSuratPengakhiranForm({
      nomor_surat: '',
      alasan_pengakhiran: 'Selesai masa bimbingan',
      nomor_sk: '',
      perihal_sk: 'Cuti Bersyarat Narapidana',
      tanggal_sk: '',
      kepala_nama: '',
    });
    setSuratPengakhiranDialogOpen(true);
  };

  const generateSuratPengakhiranPdf = async () => {
    if (!suratPengakhiranClient) return;
    const profile = (suratPengakhiranClient as any).profile;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();   // 595 pt
    const ph = doc.internal.pageSize.getHeight();   // 842 pt
    const mLeft = 72;   // ~2.54 cm
    const mRight = 65;  // ~2.29 cm
    const contentW = pw - mLeft - mRight;
    let y = 85; // ~3 cm from top

    // Helper: pt to mm for addImage
    const ptToMm = (v: number) => v * 0.3528;

    // ===== 1. KOP SURAT — rata tengah =====
    // Logo on left
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = logoImipas;
      });
      if (img.complete && img.naturalWidth > 0) {
        // Logo ~50pt wide, positioned at mLeft
        doc.addImage(img, 'PNG', mLeft, y - 8, 50, 50);
      }
    } catch {}

    const cx = pw / 2;
    // Kop lines 1-3: 10.2pt Arial Regular (helvetica), all caps
    doc.setFontSize(10.2);
    doc.setFont('helvetica', 'normal');
    doc.text('KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN', cx, y, { align: 'center' });
    y += 13;
    doc.text('DIREKTORAT JENDERAL PEMASYARAKATAN', cx, y, { align: 'center' });
    y += 13;
    doc.text('KANTOR WILAYAH JAWA TIMUR', cx, y, { align: 'center' });
    y += 15;

    // Kop line 4: 10.8pt Arial Bold
    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'bold');
    doc.text('BALAI PEMASYARAKATAN KELAS I MALANG', cx, y, { align: 'center' });
    y += 14;

    // Kop lines 5-6: 10.2pt Arial Regular
    doc.setFontSize(10.2);
    doc.setFont('helvetica', 'normal');
    doc.text('Jalan Barito No. 1, Bunulrejo, Blimbing, Kota Malang, Jawa Timur', cx, y, { align: 'center' });
    y += 12;
    doc.text('Laman: https://bapasmalang.kemenkumham.go.id  Pos-el: bapasmalang@gmail.com', cx, y, { align: 'center' });
    y += 10;

    // Horizontal separator (double line)
    doc.setLineWidth(2.2);
    doc.line(mLeft, y, pw - mRight, y);
    y += 3;
    doc.setLineWidth(0.6);
    doc.line(mLeft, y, pw - mRight, y);
    y += 22;

    // ===== 2. JUDUL — center, bold, underline =====
    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'bold');
    const titleText = 'SURAT PENGAKHIRAN';
    doc.text(titleText, cx, y, { align: 'center' });
    const tw = doc.getTextWidth(titleText);
    doc.setLineWidth(0.8);
    doc.line(cx - tw / 2, y + 2, cx + tw / 2, y + 2);
    y += 16;

    // Nomor surat — bold
    const nomorSurat = suratPengakhiranForm.nomor_surat || 'WP.15.PAS.15-PK.06.04-........';
    doc.text(`NOMOR: ${nomorSurat}`, cx, y, { align: 'center' });
    y += 24;

    // ===== 3. PEMBUKA — rata kiri =====
    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'normal');
    doc.text('Kepala Balai Pemasyarakatan (BAPAS) Kelas I Malang, dengan ini menerangkan :', mLeft, y);
    y += 20;

    // ===== 4. DATA IDENTITAS — tabel 2 kolom =====
    const colonX = 240; // fixed colon position ~240pt
    const valueX = colonX + 12;

    const birthDate = profile?.birth_date ? format(new Date(profile.birth_date), 'dd MMMM yyyy') : '-';
    const birthPlace = (profile as any)?.birth_place || '-';
    const tempatTglLahir = `${birthPlace}, ${birthDate}`;

    const identityItems: [string, string][] = [
      ['Nama', profile?.full_name || '-'],
      ['Nomor Register', suratPengakhiranClient.case_number || '-'],
      ['Tempat/ Tanggal Lahir', tempatTglLahir],
      ['Alamat', profile?.address || '-'],
    ];

    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'normal');
    const lineH = 15;
    identityItems.forEach(([label, value]) => {
      doc.text(label, mLeft + 14, y);
      doc.text(':', colonX, y);
      const maxW = pw - mRight - valueX;
      const lines = doc.splitTextToSize(value, maxW);
      doc.text(lines, valueX, y);
      y += lines.length * lineH;
    });
    y += 8;

    // ===== 5. PARAGRAF ISI — justify, indent baris pertama =====
    const indent = 28; // ~1cm indent
    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'normal');

    // Helper: justify a single line by distributing extra space between words
    const justifyLine = (text: string, x: number, yPos: number, maxW: number) => {
      const words = text.split(' ');
      if (words.length <= 1) {
        doc.text(text, x, yPos);
        return;
      }
      const textW = doc.getTextWidth(text);
      const extraSpace = (maxW - textW) / (words.length - 1);
      let curX = x;
      words.forEach((word, i) => {
        doc.text(word, curX, yPos);
        curX += doc.getTextWidth(word) + doc.getTextWidth(' ') + (i < words.length - 1 ? extraSpace : 0);
      });
    };

    // Helper: render a full paragraph justified with first-line indent
    const renderJustifiedParagraph = (text: string, firstLineW: number, restW: number) => {
      const firstLines = doc.splitTextToSize(text, firstLineW);
      if (firstLines.length === 0) return;
      // First line with indent
      const firstLine: string = firstLines[0];
      const restText = text.substring(firstLine.length).trim();
      const allRestLines = restText ? doc.splitTextToSize(restText, restW) : [];
      const totalLines = [firstLine, ...allRestLines];
      const isLastIdx = totalLines.length - 1;

      totalLines.forEach((line: string, i: number) => {
        const lx = i === 0 ? mLeft + indent : mLeft;
        const lw = i === 0 ? firstLineW : restW;
        if (i < isLastIdx) {
          justifyLine(line, lx, y, lw);
        } else {
          doc.text(line, lx, y); // last line left-aligned
        }
        y += lineH;
      });
    };

    // Paragraph 1: dasar hukum
    const tanggalSk = suratPengakhiranForm.tanggal_sk ? format(new Date(suratPengakhiranForm.tanggal_sk), 'dd MMMM yyyy') : '....................';
    const nomorSk = suratPengakhiranForm.nomor_sk || '..........................';
    const perihalSk = suratPengakhiranForm.perihal_sk;
    const skText = `Sesuai dengan Surat Keputusan Menteri Imigrasi dan Pemasyarakatan Republik Indonesia tanggal ${tanggalSk} Nomor: ${nomorSk}, perihal ${perihalSk}.`;
    renderJustifiedParagraph(skText, contentW - indent, contentW);
    y += 4;

    // Paragraph 2: tanggal pengakhiran + opsi alasan
    const dayNames: Record<string, string> = {
      Sunday: 'Minggu', Monday: 'Senin', Tuesday: 'Selasa', Wednesday: 'Rabu',
      Thursday: 'Kamis', Friday: 'Jumat', Saturday: 'Sabtu',
    };
    const endDateObj = suratPengakhiranClient.guidance_end ? new Date(suratPengakhiranClient.guidance_end) : null;
    const endDayEn = endDateObj ? format(endDateObj, 'EEEE') : '...........';
    const endDay = dayNames[endDayEn] || endDayEn;
    const endDateFull = endDateObj ? format(endDateObj, 'dd MMMM yyyy') : '...........';

    // Build the termination paragraph with strikethrough on non-selected options
    const termSegments = [
      { text: `Pada hari ${endDay} tanggal ${endDateFull} masa bimbingan diakhiri karena telah `, strike: false, bold: false },
      { text: 'Selesai masa bimbingan', strike: false, bold: true },
      { text: ' / ', strike: false, bold: false },
      { text: 'Melanggar hukum lagi', strike: true, bold: true },
      { text: ' / ', strike: false, bold: false },
      { text: 'Pindah alamat tanpa melapor dan tidak ditemukan alamat baru', strike: true, bold: true },
      { text: ' / ', strike: false, bold: false },
      { text: 'Meninggal dunia', strike: true, bold: true },
      { text: ' / ', strike: false, bold: false },
      { text: 'Pindah bimbingan ke Bapas lain', strike: true, bold: true },
      { text: ' / ', strike: false, bold: false },
      { text: 'Melanggar syarat khusus pembimbingan', strike: true, bold: true },
      { text: ' (*coret yang tidak perlu).', strike: false, bold: false, italic: true },
    ];

    // Concatenate full text and split into justified lines
    // Use bold font for measurement since bold segments are wider — prevents text cutoff
    const termFull = termSegments.map(s => s.text).join('');
    doc.setFont('helvetica', 'bold');
    const termFirstLines = doc.splitTextToSize(termFull, contentW - indent);
    const termFirstLine: string = termFirstLines[0] || '';
    const termRestText = termFull.substring(termFirstLine.length);
    const termRestLines: string[] = termRestText.length > 0 ? doc.splitTextToSize(termRestText.trimStart(), contentW) : [];
    const allTermLines = [termFirstLine, ...termRestLines];
    doc.setFont('helvetica', 'normal');

    // Render line by line with segment-based styling and justified spacing
    let segIdx = 0;
    let segCharOffset = 0;

    for (let li = 0; li < allTermLines.length; li++) {
      const lineText: string = allTermLines[li];
      const isFirstLine = li === 0;
      const isLastLine = li === allTermLines.length - 1;
      const lineX = isFirstLine ? mLeft + indent : mLeft;
      const lineMaxW = isFirstLine ? contentW - indent : contentW;

      // Calculate total text width for this line to determine justify spacing
      let totalLineTextW = 0;
      const lineWords: { text: string; strike: boolean; bold: boolean }[] = [];

      // Split line into word-level chunks with style info
      let tempSegIdx = segIdx;
      let tempSegCharOffset = segCharOffset;
      let tempRemaining = lineText.length;
      let tempLineCharPos = 0;
      let currentWord = '';
      let currentStrike = false;
      let currentBold = false;
      const styledChunks: { text: string; strike: boolean; bold: boolean }[] = [];

      while (tempRemaining > 0 && tempSegIdx < termSegments.length) {
        const seg = termSegments[tempSegIdx];
        const segRemaining = seg.text.length - tempSegCharOffset;
        const charsToRead = Math.min(tempRemaining, segRemaining);
        const chunk = seg.text.substring(tempSegCharOffset, tempSegCharOffset + charsToRead);
        styledChunks.push({ text: chunk, strike: seg.strike, bold: seg.bold });
        tempRemaining -= charsToRead;
        tempSegCharOffset += charsToRead;
        if (tempSegCharOffset >= seg.text.length) {
          tempSegIdx++;
          tempSegCharOffset = 0;
        }
      }

      // For justify: compute total text width and space count
      doc.setFont('helvetica', 'normal');
      const plainLineW = doc.getTextWidth(lineText);
      const spaceCount = (lineText.match(/ /g) || []).length;
      const extraPerSpace = (!isLastLine && spaceCount > 0) ? (lineMaxW - plainLineW) / spaceCount : 0;

      // Render chunks character by character with proper spacing
      let curX = lineX;
      let remaining = lineText.length;

      while (remaining > 0 && segIdx < termSegments.length) {
        const seg = termSegments[segIdx];
        const segRemaining = seg.text.length - segCharOffset;
        const charsToRender = Math.min(remaining, segRemaining);
        const chunk = seg.text.substring(segCharOffset, segCharOffset + charsToRender);

        doc.setFont('helvetica', seg.bold ? 'bold' : 'normal');

        if (extraPerSpace > 0) {
          // Render word by word with extra spacing
          const parts = chunk.split(' ');
          parts.forEach((part, pi) => {
            if (pi > 0) {
              curX += doc.getTextWidth(' ') + extraPerSpace;
            }
            if (part) {
              doc.text(part, curX, y);
              const partW = doc.getTextWidth(part);
              if (seg.strike) {
                const strikeY = y - 3.5;
                doc.setLineWidth(0.5);
                doc.line(curX, strikeY, curX + partW, strikeY);
              }
              curX += partW;
            }
          });
        } else {
          doc.text(chunk, curX, y);
          const chunkW = doc.getTextWidth(chunk);
          if (seg.strike) {
            const strikeY = y - 3.5;
            doc.setLineWidth(0.5);
            doc.line(curX, strikeY, curX + chunkW, strikeY);
          }
          curX += chunkW;
        }

        remaining -= charsToRender;
        segCharOffset += charsToRender;

        if (segCharOffset >= seg.text.length) {
          segIdx++;
          segCharOffset = 0;
        }
      }
      y += lineH;
    }
    doc.setFont('helvetica', 'normal');
    y += 4;

    // ===== 6. PENUTUP — justify =====
    const closingText = 'Demikian surat pengakhiran ini disampaikan. Atas perhatiannya diucapkan terima kasih.';
    renderJustifiedParagraph(closingText, contentW - indent, contentW);
    y += 20;

    // ===== 7. TANDA TANGAN — rata kanan (x ≈ 369 pt) =====
    const sigX = 369;
    const dateSurat = format(new Date(), 'dd MMMM yyyy');
    doc.setFontSize(10.8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Malang, ${dateSurat}`, sigX, y);
    y += lineH;
    doc.text('Kepala Bapas Kelas I Malang', sigX, y);
    const sigTopY = y;
    y += 60; // space for signature
    doc.setFont('helvetica', 'bold');
    doc.text(suratPengakhiranForm.kepala_nama || '............................', sigX, y);
    doc.setFont('helvetica', 'normal');

    // ===== 8. FOTO — kiri bawah area tanda tangan =====
    if (profile?.avatar_url) {
      try {
        const imgResp = await fetch(profile.avatar_url);
        const blob = await imgResp.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            const imgData = reader.result as string;
            doc.addImage(imgData, 'JPEG', mLeft, sigTopY + 5, 70, 90);
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(blob);
        });
      } catch {}
    }

    // ===== 9. TEMBUSAN — pojok kiri bawah (y ≈ 722 pt) =====
    const tembusanY = 722;
    doc.setFontSize(10.2);
    doc.setFont('helvetica', 'normal');
    doc.text('Tembusan :', mLeft, tembusanY);
    doc.text('1.  Arsip', mLeft, tembusanY + 13);

    const clientName = (profile?.full_name || 'klien').replace(/\s+/g, '_');
    doc.save(`Surat_Pengakhiran_${clientName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF Surat Pengakhiran berhasil di-generate');
    setSuratPengakhiranDialogOpen(false);
  };

  const generateLaporanBimbinganPdf = async () => {
    if (!laporanClient) return;
    const profile = (laporanClient as any).profile;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const margin = 25;
    let y = 18;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('KEMENTERIAN IMIGRASI DAN PEMASYARAKATAN REPUBLIK INDONESIA', pw / 2, y, { align: 'center' });
    y += 4;
    doc.text('DIREKTORAT JENDERAL PEMASYARAKATAN', pw / 2, y, { align: 'center' });
    y += 4;
    doc.text('KANTOR WILAYAH JAWA TIMUR', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('BALAI PEMASYARAKATAN KELAS I MALANG', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Jalan Barito No. 1, Bunulrejo, Blimbing, Malang', pw / 2, y, { align: 'center' });
    y += 4;
    doc.text('Laman: https://bapasmalang.kemenkumham.go.id, Pos-el : bapasmalang@gmail.com', pw / 2, y, { align: 'center' });
    y += 3;

    doc.setLineWidth(0.8);
    doc.line(margin, y, pw - margin, y);
    y += 1.2;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pw - margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL BIMBINGAN  DAN  PENGAWASAN KLIEN', pw / 2, y, { align: 'center' });
    y += 5;
    doc.text(`STATUS KLIEN : ${laporanForm.status_klien}`, pw / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Nomor : ${laporanForm.nomor_surat || 'WP.15.PAS.15.PK.06.03 - ........'}`, pw / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I.', margin, y);
    doc.text('IDENTITAS', margin + 8, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const masaBimbingan = laporanClient.guidance_start && laporanClient.guidance_end
      ? `${format(new Date(laporanClient.guidance_start), 'dd/MM/yyyy')} s.d. ${format(new Date(laporanClient.guidance_end), 'dd/MM/yyyy')}`
      : '-';
    const tanggalJam = laporanForm.tanggal_pelaksanaan
      ? `${format(new Date(laporanForm.tanggal_pelaksanaan), 'dd MMMM yyyy')} / Pukul ${laporanForm.jam_mulai}-${laporanForm.jam_selesai} WIB`
      : '-';

    const { data: pkProfile } = await supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle();

    const identityItems: [string, string, boolean][] = [
      ['Nama Klien', (profile?.full_name || '-').toUpperCase(), true],
      ['Nomor Register Bapas', laporanClient.case_number || '-', false],
      ['Masa Bimbingan', masaBimbingan, false],
      ['Jenis Kelamin', profile?.gender === 'L' ? 'Laki-laki' : profile?.gender === 'P' ? 'Perempuan' : profile?.gender || '-', false],
      ['Agama', laporanForm.agama, false],
      ['Jenis Bimbingan', laporanForm.jenis_bimbingan, false],
      ['Bimbingan ke', `${laporanForm.bimbingan_ke} (${numberToWord(parseInt(laporanForm.bimbingan_ke) || 1)})`, false],
      ['Pembimbing Kemasyarakatan', (pkProfile?.full_name || '-').toUpperCase(), true],
      ['Tanggal / Jam Pelaksanaan', tanggalJam, false],
      ['Tempat dilaksanakan', laporanForm.tempat, false],
    ];

    const labelX = margin + 12;
    const colonX = margin + 65;
    const valueX = margin + 68;
    const maxValueW = pw - margin - valueX;

    identityItems.forEach(([label, value, isBold], i) => {
      const num = `${i + 1}.`;
      doc.setFont('helvetica', 'normal');
      doc.text(num, margin + 5, y);
      doc.text(label, labelX, y);
      doc.text(':', colonX, y);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(value, maxValueW);
      doc.text(lines, valueX, y);
      y += lines.length * 5;
    });
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II.', margin, y);
    doc.text('MATERI BIMBINGAN', margin + 8, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const jenisBimbLabel = laporanForm.jenis_bimbingan.includes('Kemandirian') ? 'Bimbingan Kemandirian' : 'Bimbingan Kepribadian';
    doc.text(jenisBimbLabel, margin + 12, y);
    y += 6;
    doc.text('Judul Materi : ' + laporanForm.judul_materi, margin + 12, y);
    y += 6;
    doc.text('Isi Materi :', margin + 12, y);
    y += 5;

    const materiParagraphs = (laporanForm.isi_materi || '-').split('\n');
    materiParagraphs.forEach((para: string) => {
      const trimmed = para.trim();
      if (!trimmed) { y += 3; return; }
      const isSubItem = /^[a-z]\.\s/.test(trimmed);
      const hasBullet = trimmed.startsWith('-') || trimmed.startsWith('•');
      const prefix = isSubItem ? '     ' : (hasBullet ? '' : '-  ');
      const text = hasBullet ? trimmed.replace(/^[-•]\s*/, '-  ') : `${prefix}${trimmed}`;
      const indentX = isSubItem ? margin + 20 : margin + 14;
      const lines = doc.splitTextToSize(text, pw - margin - indentX);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, indentX, y);
        y += 4.5;
      });
    });
    y += 6;

    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('III.', margin, y);
    doc.text('SARAN', margin + 8, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const saranItems = [
      'Mengingatkan klien untuk mentaati norma-norma hukum dan agama;',
      'Menyarankan klien untuk meningkatkan ketaqwaan kepada Tuhan Yang Maha Esa',
      'Mengingatkan klien untuk tidak lupa melaksanakan wajib lapor setiap bulannya',
      'Memberikan semangat kepada klien dalam melaksanakan pekerjaannya sehari-hari',
    ];

    saranItems.forEach((saran, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}.`, margin + 5, y);
      const lines = doc.splitTextToSize(saran, pw - margin * 2 - 15);
      doc.text(lines, margin + 12, y);
      y += lines.length * 4.5 + 1;
    });
    y += 12;

    if (y > 230) { doc.addPage(); y = 20; }
    const tglLaporan = laporanForm.tanggal_pelaksanaan
      ? format(new Date(laporanForm.tanggal_pelaksanaan), 'd MMMM yyyy')
      : format(new Date(), 'd MMMM yyyy');

    const sigLeftX = margin + 5;
    const sigRightX = pw / 2 + 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Malang, ${tglLaporan}`, sigRightX, y);
    y += 6;
    doc.text('Mengetahui :', sigLeftX, y);
    doc.text('Pembimbing Kemasyarakatan Muda,', sigRightX, y);
    y += 5;
    doc.text('Kepala,', sigLeftX, y);
    y += 30;
    doc.setFont('helvetica', 'bold');
    const kepalaName = laporanForm.kepala_nama || '............................';
    doc.text(kepalaName, sigLeftX, y);
    doc.text(pkProfile?.full_name || '-', sigRightX, y);

    const clientName = (profile?.full_name || 'klien').replace(/\s+/g, '_');
    doc.save(`Laporan_Bimbingan_${clientName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF Laporan Bimbingan berhasil di-generate');
    setLaporanDialogOpen(false);
  };

  const numberToWord = (n: number): string => {
    const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh',
      'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas'];
    return words[n] || String(n);
  };

  const createProgram = async () => {
    if (!newProgram.name.trim()) { toast.error('Nama program wajib diisi'); return; }
    let fileUrl: string | null = null;
    if (fileInputRef.current?.files?.[0]) {
      fileUrl = await uploadPdf(fileInputRef.current.files[0]);
      if (fileUrl === null && fileInputRef.current.files[0]) return;
    }
    const { error } = await supabase.from('programs').insert({
      ...newProgram, quota: Number(newProgram.quota), schedule_date: newProgram.schedule_date || null,
      is_open: true, created_by: user!.id, file_url: fileUrl,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil dibuat');
    setDialogOpen(false);
    setNewProgram({ name: '', description: '', program_type: 'kepribadian', quota: 20, schedule_date: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    loadData();
  };

  const openEditProgram = (program: any) => {
    setEditingProgram({ ...program, schedule_date: program.schedule_date ? program.schedule_date.slice(0, 16) : '' });
    setEditDialogOpen(true);
  };

  const updateProgram = async () => {
    if (!editingProgram) return;
    let fileUrl = editingProgram.file_url;
    if (editFileInputRef.current?.files?.[0]) {
      const url = await uploadPdf(editFileInputRef.current.files[0]);
      if (url === null) return;
      fileUrl = url;
    }
    const { error } = await supabase.from('programs').update({
      name: editingProgram.name, description: editingProgram.description, program_type: editingProgram.program_type,
      quota: Number(editingProgram.quota), schedule_date: editingProgram.schedule_date || null,
      is_open: editingProgram.is_open, file_url: fileUrl,
    } as any).eq('id', editingProgram.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil diperbarui');
    setEditDialogOpen(false);
    setEditingProgram(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    loadData();
  };

  const confirmDeleteProgram = (program: any) => {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  };

  const deleteProgram = async () => {
    if (!programToDelete) return;
    const { error } = await supabase.from('programs').delete().eq('id', programToDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Program berhasil dihapus');
    setDeleteDialogOpen(false);
    setProgramToDelete(null);
    loadData();
  };

  const updateRegistration = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('program_registrations').update({
      status, reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Pendaftaran ${status === 'approved' ? 'disetujui' : 'ditolak'}`); loadData(); }
  };

  const verifyClient = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_verified: true }).eq('user_id', userId);
    if (error) toast.error(error.message);
    else { toast.success('Klien berhasil diverifikasi'); loadData(); }
  };

  const programForm = (values: any, onChange: (v: any) => void, inputRef?: React.RefObject<HTMLInputElement>) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nama Program</Label>
        <Input value={values.name} onChange={e => onChange({ ...values, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Deskripsi</Label>
        <Textarea value={values.description || ''} onChange={e => onChange({ ...values, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipe</Label>
          <Select value={values.program_type} onValueChange={v => onChange({ ...values, program_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kepribadian">Kepribadian</SelectItem>
              <SelectItem value="kemandirian">Kemandirian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kuota</Label>
          <Input type="number" value={values.quota} onChange={e => onChange({ ...values, quota: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Jadwal</Label>
        <Input type="datetime-local" value={values.schedule_date || ''} onChange={e => onChange({ ...values, schedule_date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>File PDF (opsional)</Label>
        <div className="flex items-center gap-2">
          <Input type="file" accept=".pdf" ref={inputRef as any} className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground" />
          {values.file_url && (
            <a href={values.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" /> PDF</Badge>
            </a>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold">Dashboard Pegawai PK</h1>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowMap(!showMap)}>
              <MapPin className="w-4 h-4 mr-2" /> {showMap ? 'Tutup Peta' : 'Monitoring Lokasi'}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Buat Program</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Buat Program Bimbingan</DialogTitle></DialogHeader>
                {programForm(newProgram, setNewProgram, fileInputRef)}
                <Button onClick={createProgram} disabled={uploadingPdf} className="w-full">
                  {uploadingPdf ? 'Mengupload...' : 'Simpan Program'}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notifications */}
        {clientsWithEndedGuidance.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <Bell className="h-4 w-4" />
            <AlertTitle>Masa Bimbingan Selesai</AlertTitle>
            <AlertDescription>
              {clientsWithEndedGuidance.length} klien telah melewati masa bimbingan dan perlu diakhiri:
              <ul className="mt-2 space-y-1">
                {clientsWithEndedGuidance.map(c => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span>{(c as any).profile?.full_name} — berakhir {format(new Date(c.guidance_end), 'dd MMM yyyy')}</span>
                    <Button size="sm" variant="outline" onClick={() => endGuidance(c.user_id)} className="ml-2">
                      Akhiri Bimbingan
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Filter & Search */}
        <div className="glass-card rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Tampilkan hanya klien saya</span>
              <Switch checked={showOnlyMyClients} onCheckedChange={setShowOnlyMyClients} />
              <span className="text-xs text-muted-foreground ml-2">
                {showOnlyMyClients ? `${displayedClients.length} klien Anda` : `${displayedClients.length} klien`}
              </span>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari nama atau no. litmas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status Klien</Label>
              <Select value={filterClientStatus} onValueChange={setFilterClientStatus}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="meninggal">Meninggal</SelectItem>
                  <SelectItem value="di_luar_wilayah">Di Luar Wilayah</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status Bimbingan</Label>
              <Select value={filterGuidanceStatus} onValueChange={setFilterGuidanceStatus}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="tidak_aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status Pekerjaan</Label>
              <Select value={filterEmploymentStatus} onValueChange={setFilterEmploymentStatus}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="belum_bekerja">Belum Bekerja</SelectItem>
                  <SelectItem value="sedang_pelatihan">Sedang Pelatihan</SelectItem>
                  <SelectItem value="sudah_bekerja">Sudah Bekerja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportToPdf}>
                <Download className="w-3 h-3" /> Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Klien', value: stats.total, icon: Users, color: 'text-primary' },
            { label: 'Bimbingan Aktif', value: stats.aktifBimbingan, icon: BookOpen, color: 'text-primary' },
            { label: 'Sudah Bekerja', value: stats.sudahBekerja, icon: CheckCircle, color: 'text-primary' },
            { label: 'Belum Bekerja', value: stats.belumBekerja, icon: Briefcase, color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="glass-card rounded-2xl p-5">
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        {showMap && (
          <div className="glass-card rounded-2xl p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Monitoring Lokasi Klien</h2>
            <ClientMapView />
          </div>
        )}

        {/* Programs */}
        <div>
          <h2 className="text-xl font-bold mb-4">Program Bimbingan</h2>
          {programs.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada program.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant={p.is_open ? 'default' : 'secondary'}>{p.is_open ? 'Dibuka' : 'Ditutup'}</Badge>
                  </div>
                  <Badge variant="outline" className="capitalize">{p.program_type}</Badge>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <p className="text-xs text-muted-foreground">Kuota: {p.quota}</p>
                  {p.schedule_date && (
                    <p className="text-xs text-muted-foreground">Jadwal: {format(new Date(p.schedule_date), 'dd MMM yyyy HH:mm')}</p>
                  )}
                  {(p as any).file_url && (
                    <a href={(p as any).file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                      <FileText className="w-3 h-3" /> Lihat PDF
                    </a>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditProgram(p)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => confirmDeleteProgram(p)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Registrations */}
        <div>
          <h2 className="text-xl font-bold mb-4">Pendaftaran Bimbingan</h2>
          {registrations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Belum ada pendaftaran.</p>
          ) : (
            <div className="space-y-3">
              {registrations.map(r => (
                <div key={r.id} className="glass-card rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-sm">{(r as any).programs?.name || 'Program'}</p>
                    <p className="text-xs text-muted-foreground">
                      Klien: {(r as any).client_profile?.full_name || r.client_id} • {format(new Date(r.created_at), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' ? (
                      <>
                        <Button size="sm" onClick={() => updateRegistration(r.id, 'approved')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateRegistration(r.id, 'rejected')}>
                          <XCircle className="w-4 h-4 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <Badge variant={r.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{r.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client List */}
        <div>
          <h2 className="text-xl font-bold mb-4">Data Klien</h2>
          {displayedClients.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {searchQuery ? 'Tidak ditemukan klien dengan pencarian tersebut.' : showOnlyMyClients ? 'Belum ada klien yang memilih Anda sebagai PK.' : 'Belum ada data klien.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 text-muted-foreground font-medium">Nama</th>
                    <th className="pb-3 text-muted-foreground font-medium">No. Litmas</th>
                    <th className="pb-3 text-muted-foreground font-medium">Bimbingan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Masa Bimbingan</th>
                    <th className="pb-3 text-muted-foreground font-medium">Status Klien</th>
                    <th className="pb-3 text-muted-foreground font-medium">Verifikasi</th>
                    <th className="pb-3 text-muted-foreground font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedClients.map(c => {
                    const termReport = terminationReports.find(t => t.client_id === c.user_id);
                    return (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-3">
                          <div>
                            <p>{(c as any).profile?.full_name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{(c as any).profile?.phone || ''}</p>
                          </div>
                        </td>
                        <td className="py-3">{c.case_number || '-'}</td>
                        <td className="py-3"><Badge variant="outline" className="capitalize">{c.guidance_status}</Badge></td>
                        <td className="py-3">
                          {c.guidance_start && c.guidance_end ? (
                            <span className="text-xs">
                              {format(new Date(c.guidance_start), 'dd/MM/yy')} - {format(new Date(c.guidance_end), 'dd/MM/yy')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum diatur</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Select value={(c as any).client_status || 'aktif'} onValueChange={v => updateClientStatus(c.user_id, v)}>
                            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aktif">Aktif</SelectItem>
                              <SelectItem value="meninggal">Meninggal</SelectItem>
                              <SelectItem value="di_luar_wilayah">Di Luar Wilayah</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3">{(c as any).profile?.is_verified ? <Badge variant="default">✓</Badge> : <Badge variant="secondary">✗</Badge>}</td>
                        <td className="py-3">
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => openLaporanDialog(c)} title="Generate Laporan Bimbingan">
                              <FileText className="w-3 h-3 mr-1" /> Laporan
                            </Button>
                            {!(c as any).profile?.is_verified && (
                              <Button size="sm" variant="outline" onClick={() => verifyClient(c.user_id)}>Verifikasi</Button>
                            )}
                            {c.guidance_end && new Date(c.guidance_end) <= new Date() && c.guidance_status === 'aktif' && (
                              <Button size="sm" variant="destructive" onClick={() => endGuidance(c.user_id)}>Akhiri</Button>
                            )}
                            {c.guidance_status === 'selesai' && !termReport && (
                              <Button size="sm" variant="outline" onClick={() => openTerminationDialog(c)} className="text-destructive border-destructive/50">
                                <Upload className="w-3 h-3 mr-1" /> Upload Pengakhiran
                              </Button>
                            )}
                            {c.guidance_status === 'selesai' && (
                              <Button size="sm" variant="outline" onClick={() => openSuratPengakhiranDialog(c)}>
                                <ScrollText className="w-3 h-3 mr-1" /> Surat Pengakhiran
                              </Button>
                            )}
                            {termReport && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                                  <CheckCircle className="w-3 h-3" /> Dilaporkan
                                </Badge>
                                {termReport.approval_status === 'approved' && <Badge className="bg-green-700 text-xs">ACC</Badge>}
                                {termReport.approval_status === 'rejected' && <Badge variant="destructive" className="text-xs">Ditolak</Badge>}
                                {termReport.approval_status === 'pending' && <Badge variant="secondary" className="text-xs">Menunggu</Badge>}
                                {termReport.file_url && (
                                  <a href={termReport.file_url} target="_blank" rel="noopener noreferrer">
                                    <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" /> PDF</Badge>
                                  </a>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditTerminationDialog(c, termReport)} title="Edit Laporan">
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteTerminationReport(termReport.id)} title="Hapus Laporan">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Statistics */}
        <StatistikDashboard clients={displayedClients} monthlyReports={[]} />

        {/* Edit Program Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
            {editingProgram && (
              <>
                {programForm(editingProgram, setEditingProgram, editFileInputRef)}
                <div className="flex items-center gap-3 pt-2">
                  <Label>Status Program</Label>
                  <Switch checked={editingProgram.is_open} onCheckedChange={v => setEditingProgram((p: any) => ({ ...p, is_open: v }))} />
                  <span className="text-sm text-muted-foreground">{editingProgram.is_open ? 'Dibuka' : 'Ditutup'}</span>
                </div>
                <Button onClick={updateProgram} disabled={uploadingPdf} className="w-full">
                  {uploadingPdf ? 'Mengupload...' : 'Simpan Perubahan'}
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Program Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Hapus Program</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus program <strong>{programToDelete?.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={deleteProgram}>Hapus</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Termination Report Dialog with Upload */}
        <Dialog open={terminationDialogOpen} onOpenChange={setTerminationDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{editingTermReportId ? 'Edit Laporan Pengakhiran' : 'Laporan Pengakhiran'}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Klien: <strong>{(terminationClient as any)?.profile?.full_name}</strong>
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{editingTermReportId ? 'Ganti File (Opsional)' : 'Upload File Laporan Pengakhiran (PDF)'}</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  ref={terminationFileRef}
                  onChange={e => setTerminationFile(e.target.files?.[0] || null)}
                  className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground"
                />
                <p className="text-xs text-muted-foreground">Maksimal 10MB, format PDF</p>
              </div>
              <div className="space-y-2">
                <Label>Catatan Pengakhiran (Opsional)</Label>
                <Textarea
                  value={terminationNotes}
                  onChange={e => setTerminationNotes(e.target.value)}
                  placeholder="Tuliskan catatan laporan pengakhiran bimbingan..."
                  rows={4}
                />
              </div>
              <Button onClick={editingTermReportId ? updateTerminationReport : submitTerminationReport} disabled={uploadingTermination} className="w-full gap-2">
                <Upload className="w-4 h-4" />
                {uploadingTermination ? 'Mengupload...' : editingTermReportId ? 'Perbarui Laporan' : 'Simpan Laporan Pengakhiran'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Laporan Bimbingan Dialog */}
        <Dialog open={laporanDialogOpen} onOpenChange={setLaporanDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto max-w-lg">
            <DialogHeader><DialogTitle>Generate Laporan Bimbingan</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Klien: <strong>{(laporanClient as any)?.profile?.full_name}</strong>
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status Klien</Label>
                  <Input value={laporanForm.status_klien} onChange={e => setLaporanForm(f => ({ ...f, status_klien: e.target.value }))} placeholder="CUTI BERSYARAT" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nomor Surat</Label>
                  <Input value={laporanForm.nomor_surat} onChange={e => setLaporanForm(f => ({ ...f, nomor_surat: e.target.value }))} placeholder="WP.15.PAS..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Agama</Label>
                  <Select value={laporanForm.agama} onValueChange={v => setLaporanForm(f => ({ ...f, agama: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bimbingan ke</Label>
                  <Input value={laporanForm.bimbingan_ke} onChange={e => setLaporanForm(f => ({ ...f, bimbingan_ke: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jenis Bimbingan</Label>
                <Select value={laporanForm.jenis_bimbingan} onValueChange={v => setLaporanForm(f => ({ ...f, jenis_bimbingan: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kepribadian dan Pengawasan">Kepribadian dan Pengawasan</SelectItem>
                    <SelectItem value="Kemandirian dan Pengawasan">Kemandirian dan Pengawasan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Pelaksanaan</Label>
                  <Input type="date" value={laporanForm.tanggal_pelaksanaan} onChange={e => setLaporanForm(f => ({ ...f, tanggal_pelaksanaan: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Jam Mulai</Label>
                  <Input type="time" value={laporanForm.jam_mulai} onChange={e => setLaporanForm(f => ({ ...f, jam_mulai: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Jam Selesai</Label>
                  <Input type="time" value={laporanForm.jam_selesai} onChange={e => setLaporanForm(f => ({ ...f, jam_selesai: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tempat Pelaksanaan</Label>
                <Input value={laporanForm.tempat} onChange={e => setLaporanForm(f => ({ ...f, tempat: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Judul Materi</Label>
                <Input value={laporanForm.judul_materi} onChange={e => setLaporanForm(f => ({ ...f, judul_materi: e.target.value }))} placeholder="Kewajiban klien dalam menjalani..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Isi Materi</Label>
                <Textarea value={laporanForm.isi_materi} onChange={e => setLaporanForm(f => ({ ...f, isi_materi: e.target.value }))} rows={5} placeholder="Tuliskan isi materi bimbingan..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Kepala Bapas</Label>
                <Input value={laporanForm.kepala_nama} onChange={e => setLaporanForm(f => ({ ...f, kepala_nama: e.target.value }))} placeholder="Nama Kepala Bapas" />
              </div>
              <Button onClick={generateLaporanBimbinganPdf} className="w-full gap-2">
                <Download className="w-4 h-4" /> Generate PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Surat Pengakhiran Dialog */}
        <Dialog open={suratPengakhiranDialogOpen} onOpenChange={setSuratPengakhiranDialogOpen}>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto max-w-lg">
            <DialogHeader><DialogTitle>Generate Surat Pengakhiran</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground mb-2">
              Klien: <strong>{(suratPengakhiranClient as any)?.profile?.full_name}</strong>
            </p>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nomor Surat</Label>
                <Input value={suratPengakhiranForm.nomor_surat} onChange={e => setSuratPengakhiranForm(f => ({ ...f, nomor_surat: e.target.value }))} placeholder="WP.15.PAS.15-PK.06.04-..." />
              </div>
              <p className="text-xs text-muted-foreground italic">Paragraf pengakhiran akan otomatis dibuat berdasarkan tanggal akhir bimbingan klien dengan semua opsi alasan (*coret yang tidak perlu).</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nomor SK Menteri</Label>
                  <Input value={suratPengakhiranForm.nomor_sk} onChange={e => setSuratPengakhiranForm(f => ({ ...f, nomor_sk: e.target.value }))} placeholder="PAS-2130.PK.05.03..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal SK</Label>
                  <Input type="date" value={suratPengakhiranForm.tanggal_sk} onChange={e => setSuratPengakhiranForm(f => ({ ...f, tanggal_sk: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Perihal SK</Label>
                <Input value={suratPengakhiranForm.perihal_sk} onChange={e => setSuratPengakhiranForm(f => ({ ...f, perihal_sk: e.target.value }))} placeholder="Cuti Bersyarat Narapidana" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nama Kepala Bapas</Label>
                <Input value={suratPengakhiranForm.kepala_nama} onChange={e => setSuratPengakhiranForm(f => ({ ...f, kepala_nama: e.target.value }))} placeholder="Nama Kepala Bapas" />
              </div>
              <Button onClick={generateSuratPengakhiranPdf} className="w-full gap-2">
                <Download className="w-4 h-4" /> Generate Surat Pengakhiran PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
