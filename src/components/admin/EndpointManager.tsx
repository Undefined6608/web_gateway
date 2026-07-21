import { useState } from 'react'
import axios from 'axios'
import {
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import { Button, Form, Input, Popconfirm, Select, Space, Switch, Tag, Tooltip, message } from 'antd'
import { checkMeta } from '../../config/systemMeta'
import { api, errorMessage } from '../../services/api'
import type { Endpoint, EndpointType, GatewaySystem, SaveEndpointPayload } from '../../types/api'
import { AccountRevealDialog } from '../systems/AccountRevealDialog'

type EndpointFormValue = Omit<SaveEndpointPayload, 'endpoint_id'>

type EditorState = {
  endpointId: number | null
  section: EndpointType
}

const endpointTypeOptions = [
  { value: 'online', label: '线上地址' },
  { value: 'test', label: '测试地址' },
] satisfies Array<{ value: EndpointType; label: string }>

function EndpointEditor({
  systemId,
  endpoint,
  defaultType,
  hasOnlineEndpoint,
  onCancel,
  onSaved,
}: {
  systemId: number
  endpoint: Endpoint | null
  defaultType: EndpointType
  hasOnlineEndpoint: boolean
  onCancel: () => void
  onSaved: () => void
}) {
  const [form] = Form.useForm<EndpointFormValue>()
  const [saving, setSaving] = useState(false)
  const initialValues: EndpointFormValue = endpoint
    ? {
        endpoint_type: endpoint.endpoint_type,
        url: endpoint.url,
        requires_vpn: endpoint.requires_vpn,
        is_internal_network: endpoint.is_internal_network,
        is_public_network: endpoint.is_public_network,
        remark: endpoint.remark,
      }
    : {
        endpoint_type: defaultType,
        url: '',
        requires_vpn: false,
        is_internal_network: false,
        is_public_network: false,
        remark: null,
      }

  const save = async () => {
    const values = await form.validateFields()
    const payload: SaveEndpointPayload = {
      ...values,
      remark: values.remark || null,
    }
    if (endpoint) payload.endpoint_id = endpoint.id

    setSaving(true)
    try {
      await api.saveEndpoint(systemId, payload)
      message.success(endpoint ? '地址已更新并完成检测' : '地址已新增并完成检测')
      onSaved()
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409 && values.endpoint_type === 'online') {
        message.error('每个系统只能配置一个线上地址')
      } else {
        message.error(errorMessage(error))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="endpoint-form">
      <div className="endpoint-form-title">
        <strong>{endpoint ? '编辑地址' : `新增${defaultType === 'online' ? '线上' : '测试'}地址`}</strong>
        {endpoint && <span>地址 ID：{endpoint.id}</span>}
      </div>
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false}>
        <div className="endpoint-form-main">
          <Form.Item name="endpoint_type" label="地址类型" rules={[{ required: true }]}>
            <Select
              options={endpointTypeOptions.map(option => ({
                ...option,
                disabled: option.value === 'online' && !endpoint && hasOnlineEndpoint,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="url"
            label="访问地址"
            tooltip={{ title: '地址最后要以 / 结尾，否则存活检测有可能会失效', icon: <InfoCircleOutlined /> }}
            rules={[{ required: true, message: '请输入地址' }, { type: 'url', message: '请输入有效的 HTTP/HTTPS 地址' }]}
          >
            <Input prefix={<LinkOutlined />} placeholder="https://example.com" />
          </Form.Item>
        </div>
        <Form.Item name="remark" label="网址备注">
          <Input placeholder="例如：第二套测试环境" maxLength={200} />
        </Form.Item>
        <div className="endpoint-form-foot">
          <div className="endpoint-switches">
            <Form.Item name="requires_vpn" label="需要 VPN" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_internal_network" label="公司内网" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_public_network" label="公网" valuePropName="checked"><Switch /></Form.Item>
          </div>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" loading={saving} onClick={save}>{endpoint ? '更新地址' : '新增地址'}</Button>
          </Space>
        </div>
      </Form>
    </div>
  )
}

function EndpointListItem({
  endpoint,
  system,
  onEdit,
  onRemove,
  onChecked,
}: {
  endpoint: Endpoint
  system: GatewaySystem
  onEdit: () => void
  onRemove: () => Promise<void>
  onChecked: () => void
}) {
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    try {
      await api.checkEndpoint(endpoint.id)
      message.success('检测结果已更新')
      onChecked()
    } catch (error) {
      message.error(errorMessage(error))
    } finally {
      setChecking(false)
    }
  }

  return (
    <div>
      <div className="admin-endpoint-copy">
        <a href={endpoint.url} target="_blank" rel="noopener noreferrer">{endpoint.url}</a>
        <span>{endpoint.remark || '无备注'}</span>
      </div>
      <div className="admin-endpoint-actions">
        <div className="admin-endpoint-flags">
          {endpoint.requires_vpn && <Tag className="system-network-vpn" icon={<SafetyCertificateOutlined />}>需要 VPN</Tag>}
          {endpoint.is_internal_network && <Tag className="system-network-internal" icon={<WifiOutlined />}>公司内网</Tag>}
          {endpoint.is_public_network && <Tag className="system-network-public" icon={<GlobalOutlined />}>公网</Tag>}
          <Tag color={checkMeta[endpoint.check_status].color}>{checkMeta[endpoint.check_status].label}</Tag>
        </div>
        <Space size={4}>
          <AccountRevealDialog endpoint={endpoint} systemName={system.name} />
          <Tooltip title="重新检测">
            <Button type="text" aria-label="重新检测" icon={checking ? <LoadingOutlined /> : <ReloadOutlined />} disabled={checking} onClick={check} />
          </Tooltip>
          <Tooltip title="编辑地址">
            <Button type="text" aria-label="编辑地址" icon={<EditOutlined />} onClick={onEdit} />
          </Tooltip>
          <Popconfirm
            title="删除这个地址？"
            description="删除地址会同时删除该地址关联的全部账号，此操作不可恢复。"
            okText="删除地址和账号"
            cancelText="取消"
            onConfirm={onRemove}
          >
            <Tooltip title="删除地址">
              <Button danger type="text" aria-label="删除地址" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      </div>
    </div>
  )
}

export function EndpointManager({ system, onChanged }: { system: GatewaySystem; onChanged: () => void }) {
  const [editor, setEditor] = useState<EditorState | null>(null)
  const onlineEndpoints = system.endpoints.filter(endpoint => endpoint.endpoint_type === 'online')
  const testEndpoints = system.endpoints.filter(endpoint => endpoint.endpoint_type === 'test')
  const hasOnlineEndpoint = onlineEndpoints.length > 0
  const editingEndpoint = editor?.endpointId != null
    ? system.endpoints.find(endpoint => endpoint.id === editor.endpointId) || null
    : null

  const openCreate = (section: EndpointType) => setEditor({ endpointId: null, section })
  const openEdit = (endpoint: Endpoint) => setEditor({ endpointId: endpoint.id, section: endpoint.endpoint_type })

  const remove = async (id: number) => {
    try {
      await api.deleteEndpoint(system.id, id)
      message.success('地址及关联账号已删除')
      if (editor?.endpointId === id) setEditor(null)
      onChanged()
    } catch (error) {
      message.error(errorMessage(error))
    }
  }

  const editorForm = editor && (
    <EndpointEditor
      key={editor.endpointId ?? `new-${editor.section}`}
      systemId={system.id}
      endpoint={editingEndpoint}
      defaultType={editor.section}
      hasOnlineEndpoint={hasOnlineEndpoint}
      onCancel={() => setEditor(null)}
      onSaved={() => { setEditor(null); onChanged() }}
    />
  )

  return (
    <div className="manager-section endpoint-manager">
      <section className="endpoint-group" aria-labelledby="online-endpoints-title">
        <div className="endpoint-group-header">
          <div>
            <h3 id="online-endpoints-title">线上地址</h3>
            <p>每个系统最多配置一条线上地址</p>
          </div>
          {!hasOnlineEndpoint && (
            <Button icon={<PlusOutlined />} disabled={editor?.endpointId === null && editor.section === 'online'} onClick={() => openCreate('online')}>
              新增线上地址
            </Button>
          )}
        </div>
        {editor?.section === 'online' && editorForm}
        {onlineEndpoints.length ? (
          <div className="admin-endpoints">
            {onlineEndpoints.map(endpoint => (
              <EndpointListItem
                key={endpoint.id}
                endpoint={endpoint}
                system={system}
                onEdit={() => openEdit(endpoint)}
                onRemove={() => remove(endpoint.id)}
                onChecked={onChanged}
              />
            ))}
          </div>
        ) : !editor || editor.section !== 'online' ? (
          <div className="endpoint-group-empty">尚未配置线上地址</div>
        ) : null}
      </section>

      <section className="endpoint-group" aria-labelledby="test-endpoints-title">
        <div className="endpoint-group-header">
          <div>
            <h3 id="test-endpoints-title">测试地址</h3>
            <p>{testEndpoints.length ? `已配置 ${testEndpoints.length} 条，可继续新增` : '可配置多条测试地址'}</p>
          </div>
          <Button icon={<PlusOutlined />} disabled={editor?.endpointId === null && editor.section === 'test'} onClick={() => openCreate('test')}>
            新增测试地址
          </Button>
        </div>
        {editor?.section === 'test' && editorForm}
        {testEndpoints.length ? (
          <div className="admin-endpoints">
            {testEndpoints.map(endpoint => (
              <EndpointListItem
                key={endpoint.id}
                endpoint={endpoint}
                system={system}
                onEdit={() => openEdit(endpoint)}
                onRemove={() => remove(endpoint.id)}
                onChecked={onChanged}
              />
            ))}
          </div>
        ) : !editor || editor.section !== 'test' ? (
          <div className="endpoint-group-empty">尚未配置测试地址</div>
        ) : null}
      </section>
    </div>
  )
}
