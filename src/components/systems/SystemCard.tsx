import { CloudServerOutlined, LinkOutlined } from '@ant-design/icons'
import { Tag } from 'antd'
import { developerLabels, statusMeta } from '../../config/systemMeta'
import type { DeveloperType, GatewaySystem } from '../../types/api'
import { EndpointRow } from './EndpointRow'

export function SystemCard({ system, index, onCheck }: { system: GatewaySystem; index: number; onCheck: (systemId: number, endpointId: number) => Promise<void> }) {
  const developers = (type: DeveloperType) => system.developers.filter(item => item.developer_type === type).map(item => item.person.name).join('、') || '未配置'
  const primaryEndpoint = system.endpoints.find(endpoint => endpoint.endpoint_type === 'online') || system.endpoints.find(endpoint => endpoint.endpoint_type === 'test')
  return <article className={`system-card ${system.lifecycle_status === 'closed' ? 'is-closed' : ''}`} style={{ '--delay': `${Math.min(index * 55, 330)}ms` } as React.CSSProperties}>
    <div className="system-card-head">
      <div className="system-identity"><div className="system-icon"><CloudServerOutlined /></div><div>{primaryEndpoint ? <h2><a href={primaryEndpoint.url} target="_blank" rel="noopener noreferrer" title={`打开${system.name}`}>{system.name}</a></h2> : <h2>{system.name}</h2>}<p>{system.description || '暂无系统说明'}</p></div></div>
      <div className="system-card-actions"><div className="system-tags"><Tag className={`system-status system-status-${system.lifecycle_status}`}>{statusMeta[system.lifecycle_status].label}</Tag></div></div>
    </div>
    <div className="system-people"><div><span>负责人</span><strong>{system.owner?.name || '未配置'}</strong></div>{(['page', 'backend', 'data'] as DeveloperType[]).map(type => <div key={type}><span>{developerLabels[type]}开发</span><strong>{developers(type)}</strong></div>)}</div>
    <div className="endpoint-list">{system.endpoints.length ? system.endpoints.map(endpoint => <EndpointRow key={endpoint.id} endpoint={endpoint} systemName={system.name} onCheck={id => onCheck(system.id, id)} />) : <div className="no-endpoint"><LinkOutlined /> 暂未配置访问地址</div>}</div>
  </article>
}
