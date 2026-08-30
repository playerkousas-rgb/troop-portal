'use client';
import { useState } from 'react';

export default function Collapsible({ title, children, defaultOpen = false }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`card stack collapsible ${isOpen ? 'open' : ''}`}>
      <div 
        className="collapsible-header row" 
        style={{ cursor: 'pointer', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={{ fontSize: '1.5rem' }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div className="collapsible-content stack" style={{ marginTop: '1rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}
