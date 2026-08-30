export function SummaryCard({label,value,desc,tone='blue'}:{label:string;value:number|string;desc:string;tone?:'blue'|'green'|'red'|'gold'|'purple'}){
  return <div className="card summary" style={{cursor:'pointer',textDecoration:'none',color:'inherit',display:'block'}}>
    <span className={`badge ${tone}`}>{label}</span><h2>{value}</h2><p className="muted">{desc}</p>
  </div>;
}
export function FeatureCard({title,icon,text,href}:{title:string;icon:string;text:string;href:string}){
  return <a href={href} className="card feature-card"><h3>{icon} {title}</h3><p className="muted">{text}</p><span className="btn block">進入</span></a>;
}
