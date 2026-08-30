import Link from 'next/link';

/**
 * 主系統內建的簽到／點名入口卡片。
 * 不與活動報名及付款對賬共用畫面；實際點名介面在 /attendance。
 */
export default function AttendanceCard({ description = '供日常集會及旅團自辦活動記錄 P／A／L／E／S 出席狀態。' }: { description?: string }) {
  return (
    <Link href="/attendance" className="card feature-card attendance-feature-card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="attendance-feature-icon" aria-hidden="true">📝</span>
        <span className="badge purple">內建功能</span>
      </div>
      <div>
        <h3>簽到／點名</h3>
        <p className="muted">{description}</p>
      </div>
      <span className="btn block">進入點名系統</span>
    </Link>
  );
}
