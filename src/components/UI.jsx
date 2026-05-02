import { X, ChevronDown, Check, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export const inputCls = "w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all shadow-sm";
export const labelCls = "block text-xs font-bold text-slate-600 mb-1.5 text-right";

export const badgeCls = {
  success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10  text-amber-400  border border-amber-500/20',
  danger:  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10    text-red-400    border border-red-500/20',
  info:    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10   text-blue-400   border border-blue-500/20',
};

/**
 * SearchableSelect — Combobox with live filtering
 * @param {object[]} options   - [{ value, label, sub? }]
 * @param {string}   value     - currently selected value
 * @param {function} onChange  - (value) => void
 * @param {string}   placeholder
 * @param {string}   emptyText - shown when no options match
 */
export function SearchableSelect({ options = [], value, onChange, placeholder = 'ابحث أو اختر...', emptyText = 'لا توجد نتائج' }) {
  const [query, setQuery]     = useState('');
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef(null);
  const inputRef              = useRef(null);

  // Label of currently selected option
  const selectedOption = options.find(o => o.value === value);
  const displayValue   = open ? query : (selectedOption?.label ?? '');

  // Filter options by query
  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger / Input */}
      <div
        onClick={handleOpen}
        className={`flex items-center w-full bg-white border ${open ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-slate-300'} text-slate-800 rounded-xl px-3 py-2.5 text-sm transition-all shadow-sm cursor-pointer gap-2`}
      >
        {open ? (
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <div className="flex-1 truncate">
            {selectedOption ? (
              <span className="font-bold text-slate-800">{selectedOption.label}</span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        )}
        {open && (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={placeholder}
            className="flex-1 outline-none bg-transparent text-slate-800 placeholder-slate-400 text-sm"
          />
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !open && (
            <button
              onClick={handleClear}
              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-2.5 h-2.5 text-slate-600" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[600] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm font-bold">{emptyText}</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-right px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-50 transition-colors ${opt.value === value ? 'bg-emerald-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{opt.label}</p>
                    {opt.sub && <p className="text-xs text-slate-400 font-bold truncate">{opt.sub}</p>}
                  </div>
                  {opt.value === value && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <table className="w-full data-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-slate-100">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3"><div className="skeleton bg-slate-200 h-4 w-full"></div></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ n = 4 }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="skeleton bg-slate-200 h-4 w-1/2 mb-3"></div>
          <div className="skeleton bg-slate-200 h-7 w-3/4"></div>
        </div>
      ))}
    </>
  );
}

export function EmptyState({ msg = 'لا توجد بيانات', icon = '📭' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="text-sm font-semibold">{msg}</p>
    </div>
  );
}

export function ErrorState({ msg = 'حدث خطأ ما', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-red-500 gap-3 text-center">
      <span className="text-5xl">⚠️</span>
      <p className="text-sm font-bold">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm border border-slate-200 shadow-sm transition-all font-semibold">
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = 'تأكيد', confirmClass = 'btn-primary', size = '' }) {
  if (!isOpen) return null;

  const sizeMap = { 'modal-lg': 'max-w-2xl', 'modal-xl': 'max-w-4xl', '': 'max-w-lg' };
  const maxW = sizeMap[size] || 'max-w-lg';

  const btnCls = {
    'btn-primary': 'bg-emerald-500 hover:bg-emerald-600 text-white',
    'btn-danger':  'bg-red-500    hover:bg-red-600    text-white',
    'btn-warning': 'bg-amber-500  hover:bg-amber-600  text-white',
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className={`relative w-full ${maxW} bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-slide-up`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-slate-800 text-base">{title}</h3>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
        {onConfirm && (
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl justify-start">
            <button onClick={onConfirm} className={`px-5 py-2 rounded-xl font-bold text-sm shadow-sm transition-all ${btnCls[confirmClass] || btnCls['btn-primary']}`}>
              {confirmText}
            </button>
            <button onClick={onClose} className="px-5 py-2 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-sm transition-all">
              إلغاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Pagination({ total, page, perPage, onChange }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const btnBase = 'min-w-[2rem] h-8 px-2 rounded-lg text-xs font-bold transition-all border shadow-sm';
  const active  = `${btnBase} bg-emerald-600 border-emerald-600 text-white`;
  const normal  = `${btnBase} bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900`;
  const disabled = `${btnBase} bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed shadow-none`;

  const getPageNumbers = () => {
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
        nums.push(i);
      } else if (Math.abs(i - page) === 2) {
        nums.push('...');
      }
    }
    // de-duplicate consecutive '...'
    return nums.filter((n, idx) => !(n === '...' && nums[idx - 1] === '...'));
  };

  return (
    <div className="flex items-center justify-between py-4 flex-wrap gap-2">
      <p className="text-xs text-slate-400 font-bold">
        الصفحة <span className="text-slate-700">{page}</span> من <span className="text-slate-700">{pages}</span>
        {' '}·{' '}
        إجمالي <span className="text-slate-700">{total}</span> عنصر
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          className={page <= 1 ? disabled : normal}
          disabled={page <= 1}
          onClick={() => onChange(1)}
          title="الصفحة الأولى"
        >«</button>
        <button
          className={page <= 1 ? disabled : normal}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >›</button>

        {getPageNumbers().map((num, idx) => (
          num === '...' ? (
            <span key={`dots-${idx}`} className="text-slate-400 px-1 text-xs font-bold">…</span>
          ) : (
            <button
              key={num}
              className={num === page ? active : normal}
              onClick={() => onChange(num)}
            >
              {num}
            </button>
          )
        ))}

        <button
          className={page >= pages ? disabled : normal}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >‹</button>
        <button
          className={page >= pages ? disabled : normal}
          disabled={page >= pages}
          onClick={() => onChange(pages)}
          title="الصفحة الأخيرة"
        >»</button>
      </div>
    </div>
  );
}
