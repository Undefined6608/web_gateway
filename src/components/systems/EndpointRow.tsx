import { useEffect, useState } from 'react'
import { ExclamationCircleFilled, GlobalOutlined, LoadingOutlined, ReloadOutlined, SafetyCertificateOutlined, WifiOutlined } from '@ant-design/icons'
import { Button, Tag, Tooltip, message } from 'antd'
import dayjs from 'dayjs'
import { checkMeta } from '../../config/systemMeta'
import { errorMessage } from '../../services/api'
import type { Endpoint } from '../../types/api'
import { AccountRevealDialog } from './AccountRevealDialog'

export function EndpointRow({ endpoint, systemName, onCheck }: { endpoint: Endpoint; systemName: string; onCheck: (id: number) => Promise<void> }) {
  const [checking, setChecking] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const meta = checkMeta[endpoint.check_status]

  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const check = async () => {
    setChecking(true)
    try {
      await onCheck(endpoint.id)
      message.success('检测结果已更新')
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 429) setCooldown(10)
      message.error(errorMessage(error))
    } finally { setChecking(false) }
  }

  return <div className="endpoint-row">
    <div className="endpoint-main">
      <div className="endpoint-kind">{endpoint.endpoint_type === 'online' ? '线上' : '测试'}</div>
      <div className="endpoint-url"><a href={endpoint.url} target="_blank" rel="noopener noreferrer"><span className="endpoint-link-text">{endpoint.url}</span><GlobalOutlined /></a><div className="endpoint-meta"><span className="endpoint-check-time">{endpoint.last_checked_at ? `检测于 ${dayjs(endpoint.last_checked_at).format('MM-DD HH:mm:ss')}` : '尚未检测'}</span>{endpoint.remark && <span className="endpoint-remark">{endpoint.remark}</span>}</div></div>
    </div>
    <div className="endpoint-health"><div className="endpoint-flags">{endpoint.requires_vpn && <Tag className="system-network-vpn" icon={<SafetyCertificateOutlined />}>VPN</Tag>}{endpoint.is_internal_network && <Tag className="system-network-internal" icon={<WifiOutlined />}>内网</Tag>}</div><Tag icon={meta.icon} color={meta.color}>{meta.label}</Tag><span className="metric">{endpoint.last_http_status ?? '--'} HTTP</span><span className="metric">{endpoint.last_response_time_ms != null ? `${endpoint.last_response_time_ms} ms` : '-- ms'}</span></div>
    {endpoint.last_error && <Tooltip title={endpoint.last_error}><span className="endpoint-error"><ExclamationCircleFilled /> 失败原因</span></Tooltip>}
    <div className="endpoint-actions"><AccountRevealDialog endpoint={endpoint} systemName={systemName} /><Tooltip title={cooldown ? `${cooldown} 秒后可重试` : '重新检测'}><Button className="icon-action" aria-label="重新检测" icon={checking ? <LoadingOutlined /> : <ReloadOutlined />} disabled={checking || cooldown > 0} onClick={check} /></Tooltip></div>
  </div>
}
