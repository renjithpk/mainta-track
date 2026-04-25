import React, { useState, useRef, useEffect } from 'react';
import './AssignSelect.css';

const AssignSelect = ({ value, options = [], onChange, placeholder = '-- select flat --' }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDoc, true);
    return () => document.removeEventListener('click', onDoc, true);
  }, []);

  const selected = options.find(o => o.flatNo === value) || null;

  return (
    <div className="assign-select-root" ref={rootRef}>
      <button
        type="button"
        className="assign-select-button"
        onClick={() => setOpen(s => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (selected.label || selected.flatNo) : placeholder}
        <span className="assign-select-caret">▾</span>
      </button>

      {open && (
        <ul className="assign-select-menu" role="listbox">
          <li key="__empty__" className="assign-select-item" onClick={() => { onChange(''); setOpen(false); }}>
            {placeholder}
          </li>
          {options.map((opt) => (
            <li
              key={opt.flatNo}
              role="option"
              aria-selected={opt.flatNo === value}
              className={`assign-select-item${opt.flatNo === value ? ' selected' : ''}`}
              onClick={() => { onChange(opt.flatNo); setOpen(false); }}
            >
              <div className="assign-select-item-label">{opt.label || opt.flatNo}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AssignSelect;
