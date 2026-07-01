import React, { useRef } from 'react';

interface CustomDateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function CustomDateInput({ value, onChange, style, className }: CustomDateInputProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const formatDisplay = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return val;
  };

  const handleWrapperClick = () => {
    if (dateInputRef.current) {
      try {
        // Triggers the native browser date picker popup
        dateInputRef.current.showPicker();
      } catch (err) {
        // Fallback for older browsers
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  return (
    <div 
      onClick={handleWrapperClick}
      style={{ 
        position: 'relative', 
        display: 'inline-block', 
        width: '100%', 
        minWidth: '140px',
        cursor: 'pointer' 
      }}
    >
      <input
        type="text"
        readOnly
        value={formatDisplay(value)}
        placeholder="DD/MM/YYYY"
        className={className}
        style={{
          ...style,
          width: '100%',
          paddingLeft: '35px', // Make room for calendar icon on the left
          cursor: 'pointer',
        }}
      />
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none', // Ignore pointer events so click bubbles to parent wrapper
          zIndex: -1,
        }}
      />
      <i 
        className="fa-solid fa-calendar-days" 
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6b7280',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}
