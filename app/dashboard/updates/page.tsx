'use client';
/* ═══════════════════════════════════════════════════
   MOCK 版本更新記錄（點 1）
   俾使用者睇到系統最新改變／新功能
   ═══════════════════════════════════════════════════ */

const UPDATES = [
  { date: '2026-08-31', version: 'v2.1.0', title: '管理中心重整 + 活動過期區', items: ['管理中心以統計資料置頂，再按 6 大管理項目進入', '活動加入「過期區」，已過期活動保留集合資料', '行事曆支援匯出 ICS 及訂閱 Google 日曆', '管理員可在活動、最新消息、行事曆頁直接處理'] },
  { date: '2026-08-20', version: 'v2.0.0', title: '系統大更新 · 新 UI', items: ['全新 Scout Portal UI', '首頁加入「新旅團申請及教學」', '活動通告同最新消息分開處理', '點名頁面初版'] },
  { date: '2026-08-01', version: 'v1.5.0', title: '行事曆同活動改善', items: ['行事曆檢視模式（月／週／清單）', '活動可直接回覆參加／有興趣', '類別過濾（旅團活動 / 區總會活動）'] },
  { date: '2026-07-15', version: 'v1.0.0', title: 'Scout Portal 正式上線', items: ['首版系統上線', '支援旅團選擇同登入', '基本行事曆、通告、活動功能', 'Google Sheet 後台連接'] },
];

export default function UpdatesPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center text-lg">📢</span>
        <h1 className="font-bold text-lg m-0">系統更新</h1>
      </div>
      <p className="text-[13px] text-slate-500 m-0 -mt-2 leading-relaxed">
        系統更新紀錄同新功能介紹。最新版本放最上面。
      </p>

      <div className="space-y-3">
        {UPDATES.map((u, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] bg-brand-600 text-white px-2 py-0.5 rounded font-bold">{u.version}</span>
              <span className="text-[13px] text-slate-500">{u.date}</span>
            </div>
            <h3 className="font-bold text-[13px] m-0 mb-1.5">{u.title}</h3>
            <ul className="m-0 pl-4 space-y-0.5">
              {u.items.map((item, j) => (
                <li key={j} className="text-[13px] text-slate-600 leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}