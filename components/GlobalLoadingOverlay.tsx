'use client';
import { useEffect, useState } from 'react';

export default function GlobalLoadingOverlay() {
  const [active, setActive] = useState(false);
  const [msg, setMsg] = useState('⏳ 正在同步寫入試算表，請稍候...');

  useEffect(() => {
    function onStart(e: any) {
      setActive(true);
      setMsg('⏳ 正在將資料同步寫入 Google Sheet 試算表，請耐心稍候 (約 1-2 秒)...');
    }
    function onEnd() {
      setActive(false);
    }
    window.addEventListener('scout:loading-start', onStart);
    window.addEventListener('scout:loading-end', onEnd);
    return () => {
      window.removeEventListener('scout:loading-start', onStart);
      window.removeEventListener('scout:loading-end', onEnd);
    };
  }, []);

  if (!active) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: '#fff', padding: '24px 36px', borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '3px solid #f9ab00',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        maxWidth: '85vw', textAlign: 'center'
      }}>
        <div style={{
          width: '48px', height: '48px', border: '5px solid #f3f3f3',
          borderTop: '5px solid #f9ab00', borderRadius: '50%',
          animation: 'scout-spin 1s linear infinite'
        }} />
        <div>
          <h3 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '1.25rem' }}>資料同步寫入中</h3>
          <p style={{ margin: 0, color: '#555', fontWeight: 'bold', fontSize: '1rem' }}>{msg}</p>
        </div>
        <style jsx>{`
          @keyframes scout-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
