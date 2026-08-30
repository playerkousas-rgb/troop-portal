import { ConnectorPanel } from '@/components/RegistryMarketplace';
export default function Connectors(){return <div className="stack"><section className="hero"><span className="badge gold">轉駁中心</span><h1>本旅轉駁狀態</h1><p>顯示 registry 中本旅已安裝元件、解析後 URL 及開啟測試。第2級用 plugins.url；第3級用 units.endpoints。</p></section><ConnectorPanel/></div>}
