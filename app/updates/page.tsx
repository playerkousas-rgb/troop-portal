import Link from 'next/link';

// 更新公告 = 我哋喺 GIT 前台做嘅版本更新，話俾用戶知有咩改動／新功能。
// 每一項標明「必須套用」（要重新部署 GS / 更新前端）定「建議」。
type UpdateItem = {
  version: string;
  date: string;
  title: string;
  mandatory: boolean;
  points: string[];
};

const UPDATES: UpdateItem[] = [
  {
    version: '3.0-live',
    date: '2026-08-30',
    title: '3.0 正式版（API 拆分 + 前端連接）',
    mandatory: true,
    points: [
      '後台新增「按頁載入」API：行事曆／活動／通告／成員等各取所需，開 APP 更快',
      '角色過濾統一，管理員／領袖／成員／家長各見各嘅內容',
      '修復超級管理員（sheep）登入後空白問題',
      '修復後台回傳敏感設定外洩問題',
      '「重新生成 API Key」加入防呆，唔再連埋多餘字元',
      '新旅團申請：由填表提交改為直接送交平台管理員審核',
      '物資清單與借用流程上線：成員申請借用、領袖批核、歸還回補庫存',
    ],
  },
  {
    version: '2.0',
    date: '2026-08',
    title: '2.0 重構版（UI 優先）',
    mandatory: false,
    points: [
      '全站 UI 重整，手機友善、導航可橫向滑動',
      '活動／通告／圖書館／行事曆按最新邏輯重整',
      '使用者管理加入「批量開戶」：下載 CSV 範本、上傳一次開',
      '控制台同類功能收成大卡，管理員控制台由約 21 個卡縮到 7 個區塊',
    ],
  },
  {
    version: '1.0',
    date: '2026',
    title: '1.0 初版',
    mandatory: false,
    points: [
      '多旅團共用嘅旅團管理系統上線',
      '基本帳號、活動、通告、行事曆功能',
    ],
  },
];

export default function Updates() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-24 space-y-4">
      <Link href="/" className="no-underline text-[12px] font-bold text-slate-600 hover:text-brand-700 inline-flex items-center gap-1">
        ← 返回首頁
      </Link>

      <section className="text-center pt-1">
        <div className="text-4xl mb-1" aria-hidden>📢</div>
        <h1 className="text-2xl font-black text-brand-700 leading-tight m-0">更新公告</h1>
        <p className="text-[12px] text-slate-500 mt-2 mb-0 leading-relaxed">
          Scout System 版本更新日誌。紅色「必須」＝要重新部署後台／更新前端先生效；
          灰色「建議」＝選擇性功能。
        </p>
      </section>

      <div className="space-y-3">
        {UPDATES.map(u => (
          <section key={u.version} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h2 className="font-bold text-sm text-slate-800 m-0 flex items-center gap-2">
                <span className="text-sm font-black bg-slate-800 text-white rounded-lg px-2 py-1">{u.version}</span>
                {u.title}
              </h2>
              <span className="text-sm text-slate-400 font-semibold">{u.date}</span>
            </div>
            <span
              className={`inline-block text-[12px] font-black rounded-full px-2 py-0.5 ${
                u.mandatory ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {u.mandatory ? '必須套用' : '建議'}
            </span>
            <ul className="text-[12px] text-slate-600 leading-relaxed mt-2 mb-0 pl-5 space-y-1">
              {u.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
