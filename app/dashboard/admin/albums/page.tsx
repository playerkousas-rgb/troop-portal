'use client';
import Link from 'next/link';
import { useState } from 'react';

type Album = { title: string; event: string; branch: string; date: string; url: string; count: number };
const ALBUMS: Album[] = [
  { title: '2026 旅團露營', event: '旅團露營', branch: '童軍', date: '2026-08-22', url: 'https://drive.google.com/drive/folders/example', count: 86 },
  { title: '幼童軍水上活動', event: '水上活動', branch: '幼童軍', date: '2026-08-15', url: 'https://photos.google.com/example', count: 42 },
  { title: '升旗禮及服務日', event: '升旗禮', branch: '全旅', date: '2026-08-01', url: 'https://drive.google.com/drive/folders/example2', count: 31 },
];

export default function AlbumsPage() {
  const [albums, setAlbums] = useState(ALBUMS);
  const [form, setForm] = useState({ title: '', event: '', branch: '全旅', url: '' });
  function addAlbum() {
    if (!form.title.trim() || !form.url.trim()) return;
    setAlbums(prev => [{ ...form, title: form.title.trim(), event: form.event.trim() || '未指定活動', date: new Date().toISOString().slice(0, 10), count: 0 }, ...prev]);
    setForm({ title: '', event: '', branch: '全旅', url: '' });
  }
  return (
    <main className="max-w-5xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div>
        <Link href="/dashboard/admin" className="text-[13px] font-bold text-slate-500 no-underline">← 返回管理中心</Link>
        <h1 className="font-black text-xl text-slate-900 m-0 mt-1">📷 相簿管理</h1>
        <p className="text-[13px] text-slate-500 m-0 mt-1">加入及管理活動相簿連結；成員及家長會從下方「相簿」直接開啟連結。</p>
      </div>
      <section className="bg-white border border-violet-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-bold text-sm m-0">＋ 加入活動相簿連結</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="相簿名稱" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="所屬活動（例如：旅團露營）" value={form.event} onChange={e => setForm({ ...form, event: e.target.value })} />
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={form.branch} onChange={e => setForm({ ...form, branch: e.target.value })}><option>全旅</option><option>小童軍</option><option>幼童軍</option><option>童軍</option><option>深資</option><option>樂行</option></select>
          <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Google Drive／Google 相簿連結" type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
        </div>
        <button className="text-sm font-bold text-white bg-brand-600 rounded-lg px-3 py-2" onClick={addAlbum}>儲存相簿連結</button>
      </section>
      <section className="grid gap-3">
        {albums.map(album => (
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
