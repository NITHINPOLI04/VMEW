import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
  colorClass?: string;
  bgClass?: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  id?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName = 'rounded-lg py-1.5 pl-3 pr-2.5',
  panelClassName = '',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between appearance-none bg-white border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors shadow-sm ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption?.icon}
          <span className={`truncate ${selectedOption?.colorClass || 'text-slate-700'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`dropdown-panel absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto custom-scrollbar ${panelClassName}`}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`dropdown-item flex items-center gap-2 w-full text-left ${value === opt.value ? 'bg-slate-50 font-semibold' : 'font-medium'} hover:${opt.bgClass || 'bg-slate-50'} ${opt.bgClass && value === opt.value ? opt.bgClass : ''}`}
            >
              {opt.icon}
              <span className={`flex-1 truncate ${opt.colorClass || ''}`}>
                {opt.label}
              </span>
              {value === opt.value && <Check size={14} className={opt.colorClass || 'text-blue-600'} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
