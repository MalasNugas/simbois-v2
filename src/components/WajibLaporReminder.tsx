import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

interface WajibLaporReminderProps {
  hasReportedThisMonth: boolean;
  guidanceEnd: string | null;
}

export default function WajibLaporReminder({ hasReportedThisMonth, guidanceEnd }: WajibLaporReminderProps) {
  if (hasReportedThisMonth) return null;

  const isGuidanceEnded = guidanceEnd && new Date(guidanceEnd) < new Date();
  if (isGuidanceEnded) return null;

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <Bell className="h-4 w-4" />
      <AlertTitle>Reminder Wajib Lapor</AlertTitle>
      <AlertDescription>
        Anda belum melakukan wajib lapor bulan ini. Segera lakukan absensi/wajib lapor untuk memenuhi kewajiban pelaporan.
      </AlertDescription>
    </Alert>
  );
}
