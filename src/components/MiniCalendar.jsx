import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

function MiniCalendar({ selectedDates, onToggleDate, words = [] }) {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dayNames = t('day_names', { returnObjects: true }) || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const daysWithEntries = useMemo(() => {
    const dates = new Set();
    words.forEach(word => {
      if (word.created_at) {
        const dateStr = format(new Date(word.created_at), 'yyyy-MM-dd');
        dates.add(dateStr);
      }
    });
    return dates;
  }, [words]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const rows = [];
  let days = [];
  calendarDays.forEach((day, i) => {
    days.push(day);
    if ((i + 1) % 7 === 0) {
      rows.push(days);
      days = [];
    }
  });

  return (
    <div className="bg-[#252525] p-3 rounded-xl border border-[#333] select-none w-full max-w-[280px] shadow-lg">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-bold text-[#818cf8]">
            {i18n.language === 'ja' ? format(currentMonth, 'yyyy年 MM月') : format(currentMonth, 'yyyy / MM')}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#333] rounded-lg transition-colors text-[#888]"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#333] rounded-lg transition-colors text-[#888]"><ChevronRight size={16} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d, i) => (
          <div key={i} className="text-[14px] text-[#555] text-center font-bold">{d}</div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {row.map((day, j) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDates.has(dateStr);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const hasEntry = daysWithEntries.has(dateStr);

              return (
                <div
                  key={j}
                  onClick={() => onToggleDate(dateStr)}
                  className={clsx(
                    "relative aspect-square flex flex-col items-center justify-center text-[14px] rounded-lg cursor-pointer transition-all",
                    isSelected ? "bg-[#818cf8] text-white font-bold scale-105 shadow-md" : isCurrentMonth ? "text-[#ccc] hover:bg-[#333]" : "text-[#444] hover:bg-[#222]",
                    isToday && !isSelected && "border border-[#818cf8] text-[#818cf8]"
                  )}
                >
                  <span className={clsx(hasEntry && "mb-1")}>{format(day, 'd')}</span>
                  {hasEntry && (
                    <div className={clsx("absolute bottom-1 w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-red-500 shadow-[0_0_2px_rgba(239,68,68,0.5)]")} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MiniCalendar;
