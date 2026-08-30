import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}

/** 設計化的空狀態 — 取代「暫無…」乾文字,讓空頁面也有完整感 */
export default function EmptyState({ icon = '📭', title, desc, action }: EmptyStateProps) {
  return (
    <div className="card empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {desc && <p className="muted">{desc}</p>}
      {action && <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>{action}</div>}
    </div>
  );
}
