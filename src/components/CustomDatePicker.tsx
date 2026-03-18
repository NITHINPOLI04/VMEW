import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonth, getYear } from 'date-fns';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface CustomDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  dateFormat?: string;
  id?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  selected, 
  onChange, 
  placeholderText,
  className = '',
  dateFormat = "MMM d, yyyy",
  id
}) => {
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [yearPage, setYearPage] = useState(getYear(selected || new Date()));

  // Generate 12 years for the year picker grid (3x4)
  const startYear = Math.floor(yearPage / 12) * 12;
  const YEARS = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className="relative custom-datepicker-container">
      <DatePicker
        id={id}
        selected={selected}
        onChange={(date) => {
          onChange(date);
          setView('days');
        }}
        placeholderText={placeholderText}
        dateFormat={dateFormat}
        portalId="root"
        popperClassName="datepicker-popper-overlay"
        calendarClassName={view !== 'days' ? 'datepicker-selection-view' : ''}
        className={`w-full bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-sm text-slate-700 cursor-pointer ${className}`}
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex flex-col">
            {/* Header Navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button
                onClick={() => {
                  if (view === 'years') setYearPage(v => v - 12);
                  else decreaseMonth();
                }}
                disabled={view === 'days' && prevMonthButtonDisabled}
                type="button"
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setView(view === 'months' ? 'days' : 'months');
                  }}
                  className={`px-2 py-1 rounded-md text-sm font-bold transition-colors ${view === 'months' ? 'bg-blue-50 text-blue-600' : 'text-slate-800 hover:bg-slate-100'}`}
                >
                  {FULL_MONTHS[getMonth(date)]}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setView(view === 'years' ? 'days' : 'years');
                  }}
                  className={`px-2 py-1 rounded-md text-sm font-bold transition-colors ${view === 'years' ? 'bg-blue-50 text-blue-600' : 'text-slate-800 hover:bg-slate-100'}`}
                >
                  {getYear(date)}
                </button>
              </div>

              <button
                onClick={() => {
                  if (view === 'years') setYearPage(v => v + 12);
                  else increaseMonth();
                }}
                disabled={view === 'days' && nextMonthButtonDisabled}
                type="button"
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </div>

            {/* Selection Grids */}
            {view === 'months' && (
              <div className="selection-grid p-3">
                {MONTHS.map((month, idx) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => {
                      changeMonth(idx);
                      setView('days');
                    }}
                    className={`selection-item ${getMonth(date) === idx ? 'selection-item-active' : ''}`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {view === 'years' && (
              <div className="selection-grid selection-grid-years p-3">
                {YEARS.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      changeYear(year);
                      setView('days');
                    }}
                    className={`selection-item ${getYear(date) === year ? 'selection-item-active' : ''}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      />
      <CalendarIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
};

export default CustomDatePicker;
