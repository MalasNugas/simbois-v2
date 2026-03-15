import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MonthlyReportCalendarProps {
  reports: { report_date: string; report_month: number; report_year: number }[];
}

export default function MonthlyReportCalendar({ reports }: MonthlyReportCalendarProps) {
  const [month, setMonth] = useState(new Date());

  const reportDates = new Set(reports.map(r => r.report_date));

  const modifiers = {
    reported: (date: Date) => reportDates.has(format(date, 'yyyy-MM-dd')),
  };

  const modifiersClassNames = {
    reported: 'bg-green-500/20 text-green-400 font-bold border border-green-500/40',
  };

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        className={cn("p-3 pointer-events-auto")}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
      />
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
          <span>Sudah Wajib Lapor</span>
        </div>
      </div>
    </div>
  );
}
