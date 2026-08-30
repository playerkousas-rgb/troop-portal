'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSession, Session } from '@/lib/session';
import { Role } from '@/lib/model';
export default function Auth({roles,children}:{roles?:Role[];children:React.ReactNode}){const [s,setS]=useState<Session|null|undefined>(undefined);useEffect(()=>setS(getSession()),[]);if(s===undefined)return <div className="card">載入中...</div>;const isSemiLeader = s?.role === 'member' && !!(s as any).specialRole;if(!s || (roles && !roles.includes(s.role) && !isSemiLeader))return <section className="hero"><span className="badge red">需要登入</span><h1>需要合適權限</h1><p>請先登入旅團，或切換到有權限的示範角色。</p><Link className="btn primary" href="/login">前往登入</Link></section>;return <>{children}</>}
