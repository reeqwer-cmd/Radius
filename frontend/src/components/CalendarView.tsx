import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { PyWebViewAPI } from '../types/api';
import { EditorView } from './EditorView';

interface CalendarViewProps {
  workspaceId: number | null;
  api?: PyWebViewAPI | null;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const CalendarView: React.FC<CalendarViewProps> = ({ workspaceId, api }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const formatDateKey = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  
  // Данные дня загружаются только при смене даты, чтобы не триггерить ререндер редактора при вводе
  const [initialData, setInitialData] = useState<any>(null);
  const noteDataRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [monthMarks, setMonthMarks] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState('Готов');

  const saveTimerRef = useRef<any>(null);

  const loadMonthNotes = useCallback(async () => {
    if (!api || !workspaceId) return;
    const ym = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const marks = await api.get_calendar_notes_month(workspaceId, ym);
    setMonthMarks(marks || {});
  }, [api, workspaceId, currentYear, currentMonth]);

  const loadDayNote = useCallback(async (dateStr: string) => {
    if (!api || !workspaceId) return;
    setIsLoading(true);
    const data = await api.get_calendar_note(workspaceId, dateStr);
    const defaultData = data || { blocks: [{ type: 'paragraph', data: { text: '' } }] };
    noteDataRef.current = defaultData;
    setInitialData(defaultData);
    setIsLoading(false);
    setStatus('Готов');
  }, [api, workspaceId]);

  useEffect(() => {
    loadMonthNotes();
  }, [loadMonthNotes]);

  useEffect(() => {
    loadDayNote(selectedDate);
  }, [selectedDate, loadDayNote]);

  const handleEditorChange = useCallback((updatedData: any) => {
    noteDataRef.current = updatedData;
    setStatus('Изменения...');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!api || !workspaceId) return;
      const res = await api.save_calendar_note(workspaceId, selectedDate, updatedData);
      if (res && res.status === 'ok') {
        setStatus(`Сохранено (${res.time?.split(' ')[1] || ''})`);
        loadMonthNotes();
      } else {
        setStatus('Ошибка сохранения');
      }
    }, 1000);
  }, [api, workspaceId, selectedDate, loadMonthNotes]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  // Убираем хвостик " г.", чтобы дата выглядела аккуратно и никогда не ломалась на две строки
  const formatDateTitle = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.replace(/\s+г\.?$/i, '');
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', gap: 24, overflow: 'hidden' }}>
      <style>{`
        .calendar-editor-container #editorjs {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          max-width: 100% !important;
          padding: 8px 12px 40px 12px !important;
          min-height: 100% !important;
        }
      `}</style>

      {/* Левая панель: Календарная сетка */}
      <div style={{
        width: 350,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', flex: 1 }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="dock-btn-sm" onClick={handlePrevMonth} title="Предыдущий месяц"><ChevronLeft size={16} /></button>
            <button className="dock-btn-sm" onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); }}>Сегодня</button>
            <button className="dock-btn-sm" onClick={handleNextMonth} title="Следующий месяц"><ChevronRight size={16} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
          {WEEK_DAYS.map(w => <div key={w}>{w}</div>)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1, alignContent: 'start' }}>
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty_${idx}`} />;
            }
            const dateStr = formatDateKey(currentYear, currentMonth, day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayKey;
            const hasNote = !!monthMarks[dateStr];

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--accent)' : (isToday ? 'var(--item-active)' : 'transparent'),
                  color: isSelected ? 'var(--accent-text)' : 'var(--text-main)',
                  fontWeight: isSelected || isToday ? 700 : 400,
                  border: isToday && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  position: 'relative',
                  transition: 'background-color 0.15s'
                }}
              >
                <span style={{ fontSize: 13 }}>{day}</span>
                {hasNote && (
                  <div style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--accent-text)' : 'var(--accent)',
                    position: 'absolute',
                    bottom: 4
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Правая панель: Редактор заметок дня */}
      <div style={{
        flex: 1,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Шапка с фиксированной высотой — никогда не прыгает */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 38,
          marginBottom: 12,
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 12,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <CalendarIcon size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <h2 style={{
              margin: 0,
              fontSize: 18,
              color: 'var(--accent)',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {formatDateTitle(selectedDate)}
            </h2>
          </div>
          <span
            className="status-badge"
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: 12
            }}
          >
            {status}
          </span>
        </div>

        <div className="calendar-editor-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {!isLoading && initialData && (
            <EditorView
              key={selectedDate}
              data={initialData}
              onChange={handleEditorChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};