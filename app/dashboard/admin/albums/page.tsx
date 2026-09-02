'use client';
import Link from 'next/link';

const ALBUMS = [
  { title: '2026 旅團露營', event: '旅團露營', branch: '童軍', date: '2026-08-22', url: 'https://drive.google.com/drive/folders/example', count: 86 },
  { title: '幼童軍水上活動', event: '水上活動', branch: '幼童軍', date: '2026-08-15', url: 'https://photos.google.com/example', count: 42 },
  { title: '升旗禮及服務日', event: '升旗禮', branch: '全旅', date: '2026-08-01', url: 'https://drive.google.com/drive/folders/example2', count: 31 },
];

export default function AlbumsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div>
        <Link href="/dashboard/admin" className="text-[13px] font-bold text-slate-500 no-underline">← 返回管理中心</Link>
        <h1 className="font-black text-xl text-slate-900 m-0 mt-1">📷 活動相簿</h1>
        <p className="text-[13px] text-slate-500 m-0 mt-1">集中查看已加入活動的相簿；相簿連結仍由活動管理設定。</p>
      </div>
      <section className="grid gap-3">
        {ALBUMS.map(album => (
          <article key={album.title} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-3xl">📷</div>
            <div className="flex-1 min-w-[200px]"><h2 className="font-bold text-sm m-0">{album.title}</h2><p className="text-[13px] text-slate-500 m-0 mt-1">{album.event} · {album.branch} · {album.date}</p><p className="text-[13px] text-slate-500 m-0 mt-1">{album.count} 張相片</p></div>
            <a className="text-[13px] font-bold text-white bg-brand-600 rounded-lg px-3 py-2 no-underline" href={album.url} target="_blank" rel="noreferrer">開啟相簿 ↗</a>
          </article>
        ))}
      </section>
    </main>
  );
}
