'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'right', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Node && containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Move DOM focus to the focused item
  useEffect(() => {
    if (focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex(0);
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setFocusedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {/* Trigger wrapper */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className="outline-none"
      >
        {trigger}
      </div>

      {/* Menu */}
      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          className={cn(
            'absolute z-50 mt-1 min-w-[160px] rounded-lg border border-slate-700',
            'bg-slate-800 py-1 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <div key={item.label}>
              {item.divider && i > 0 && (
                <div className="my-1 border-t border-slate-700" role="separator" />
              )}
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                  setFocusedIndex(-1);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white focus:outline-none"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
