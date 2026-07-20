import { useState } from 'react'
import { DeleteOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Empty, Form, Input, Popconfirm, Select, Space, Tag, message } from 'antd'
import { checkMeta } from '../../config/systemMeta'
import { api, errorMessage } from '../../services/api'
import type { EndpointType, GatewaySystem } from '../../types/api'

export function EndpointManager({ system, onChanged }: { system: GatewaySystem; onChanged: () => void }) {
  const [form] = Form.useForm<{ endpoint_type: EndpointType; url: string }>()
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try { await api.saveEndpoint(system.id, values); message.success('地址已保存并完成检测'); form.resetFields(); onChanged() }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const remove = async (id: number) => {
    try { await api.deleteEndpoint(system.id, id); message.success('地址已删除'); onChanged() }
    catch (error) { message.error(errorMessage(error)) }
  }

  return <div className="manager-section">
    <div className="inline-form"><Form form={form} layout="inline" initialValues={{ endpoint_type: 'online' }}><Form.Item name="endpoint_type" rules={[{ required: true }]}><Select style={{ width: 112 }} options={[{ value: 'online', label: '线上地址' }, { value: 'test', label: '测试地址' }]} /></Form.Item><Form.Item name="url" rules={[{ required: true, message: '请输入地址' }, { type: 'url', message: '请输入有效的 HTTP/HTTPS 地址' }]}><Input prefix={<LinkOutlined />} placeholder="https://example.com" /></Form.Item><Button type="primary" loading={saving} onClick={save}>保存地址</Button></Form></div>
    {system.endpoints.length ? <div className="admin-endpoints">{system.endpoints.map(endpoint => <div key={endpoint.id}><div><Tag color={endpoint.endpoint_type === 'online' ? 'cyan' : 'default'}>{endpoint.endpoint_type === 'online' ? '线上' : '测试'}</Tag><a href={endpoint.url} target="_blank" rel="noopener noreferrer">{endpoint.url}</a></div><Space><Tag color={checkMeta[endpoint.check_status].color}>{checkMeta[endpoint.check_status].label}</Tag><Popconfirm title="删除这个地址？" onConfirm={() => remove(endpoint.id)}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm></Space></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未配置地址" />}
  </div>
}
