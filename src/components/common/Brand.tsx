import { ApiOutlined } from '@ant-design/icons'

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
    <div className="brand-mark"><ApiOutlined /></div>
    {!compact && <div><strong>系统集成网关</strong><span>INTEGRATION CONTROL</span></div>}
  </div>
}
