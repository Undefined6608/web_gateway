import { useState } from 'react'
import { DeleteOutlined, EditOutlined, LinkOutlined, SafetyCertificateOutlined, WifiOutlined } from '@ant-design/icons'
import { Button, Empty, Form, Input, Popconfirm, Select, Space, Switch, Tag, Tooltip, message } from 'antd'
import { checkMeta } from '../../config/systemMeta'
import { api, errorMessage } from '../../services/api'
import type { Endpoint, EndpointType, GatewaySystem } from '../../types/api'

type EndpointFormValue = {
  endpoint_type: EndpointType
  url: string
  requires_vpn: boolean
  is_internal_network: boolean
  remark: string | null
}

export function EndpointManager({ system, onChanged }: { system: GatewaySystem; onChanged: () => void }) {
  const [form] = Form.useForm<EndpointFormValue>()
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const edit = (endpoint: Endpoint) => {
    setEditingId(endpoint.id)
    form.setFieldsValue({ endpoint_type: endpoint.endpoint_type, url: endpoint.url, requires_vpn: endpoint.requires_vpn, is_internal_network: endpoint.is_internal_network, remark: endpoint.remark })
  }

  const reset = () => {
    setEditingId(null)
    form.setFieldsValue({ endpoint_type: 'online', url: '', requires_vpn: false, is_internal_network: false, remark: null })
  }

  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try { await api.saveEndpoint(system.id, { ...values, remark: values.remark || null }); message.success('地址已保存并完成检测'); reset(); onChanged() }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    try { await api.deleteEndpoint(system.id, id); message.success('地址及关联账号已删除'); if (editingId === id) reset(); onChanged() }
    catch (error) { message.error(errorMessage(error)) }
  }

  return <div className="manager-section">
    <div className="endpoint-form"><Form form={form} layout="vertical" initialValues={{ endpoint_type: 'online', requires_vpn: false, is_internal_network: false }} requiredMark={false}>
      <div className="endpoint-form-main"><Form.Item name="endpoint_type" label="地址类型" rules={[{ required: true }]}><Select options={[{ value: 'online', label: '线上地址' }, { value: 'test', label: '测试地址' }]} /></Form.Item><Form.Item name="url" label="访问地址" rules={[{ required: true, message: '请输入地址' }, { type: 'url', message: '请输入有效的 HTTP/HTTPS 地址' }]}><Input prefix={<LinkOutlined />} placeholder="https://example.com" /></Form.Item></div>
      <Form.Item name="remark" label="网址备注"><Input placeholder="例如：生产环境入口" maxLength={200} /></Form.Item>
      <div className="endpoint-form-foot"><div className="endpoint-switches"><Form.Item name="requires_vpn" label="需要 VPN" valuePropName="checked"><Switch /></Form.Item><Form.Item name="is_internal_network" label="公司内网" valuePropName="checked"><Switch /></Form.Item></div><Space>{editingId && <Button onClick={reset}>取消编辑</Button>}<Button type="primary" loading={saving} onClick={save}>{editingId ? '更新地址' : '保存地址'}</Button></Space></div>
    </Form></div>
    {system.endpoints.length ? <div className="admin-endpoints">{system.endpoints.map(endpoint => <div key={endpoint.id}><div className="admin-endpoint-copy"><div><Tag color={endpoint.endpoint_type === 'online' ? 'cyan' : 'default'}>{endpoint.endpoint_type === 'online' ? '线上' : '测试'}</Tag><a href={endpoint.url} target="_blank" rel="noopener noreferrer">{endpoint.url}</a></div><span>{endpoint.remark || '无备注'}</span></div><Space className="admin-endpoint-actions"><div className="admin-endpoint-flags">{endpoint.requires_vpn && <Tag className="system-network-vpn" icon={<SafetyCertificateOutlined />}>VPN</Tag>}{endpoint.is_internal_network && <Tag className="system-network-internal" icon={<WifiOutlined />}>内网</Tag>}</div><Tag color={checkMeta[endpoint.check_status].color}>{checkMeta[endpoint.check_status].label}</Tag><Tooltip title="编辑地址"><Button type="text" icon={<EditOutlined />} onClick={() => edit(endpoint)} /></Tooltip><Popconfirm title="删除这个地址？" description="删除地址会同时删除该地址关联的全部账号，此操作不可恢复。" okText="删除地址和账号" cancelText="取消" onConfirm={() => remove(endpoint.id)}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm></Space></div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未配置地址" />}
  </div>
}
