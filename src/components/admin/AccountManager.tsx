import { useCallback, useEffect, useMemo, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import { api, errorMessage } from '../../services/api'
import type { GatewaySystem, SystemAccount } from '../../types/api'

export function AccountManager({ system }: { system: GatewaySystem }) {
  const [accounts, setAccounts] = useState<SystemAccount[]>([])
  const [editing, setEditing] = useState<SystemAccount | null | undefined>(undefined)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const endpointNames = useMemo(() => new Map(system.endpoints.map(endpoint => [endpoint.id, endpoint.endpoint_type === 'online' ? '线上地址' : '测试地址'])), [system.endpoints])
  const endpointOptions = system.endpoints.map(endpoint => ({ value: endpoint.id, label: `${endpoint.endpoint_type === 'online' ? '线上' : '测试'} · ${endpoint.url}` }))
  const load = useCallback(async () => { try { setAccounts(await api.accounts(system.id)) } catch (error) { message.error(errorMessage(error)) } }, [system.id])
  useEffect(() => { void load() }, [load])
  const open = (account: SystemAccount | null) => { setEditing(account); form.setFieldsValue(account ? { ...account, password: '' } : { endpoint_id: endpointOptions[0]?.value, role_name: '', account_name: '', password: '', is_enabled: true, remark: '' }) }
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = { ...values, remark: values.remark || null }
      if (editing) await api.updateAccount(system.id, editing.id, { ...payload, password: values.password || null })
      else await api.createAccount(system.id, payload)
      message.success('账号已保存'); setEditing(undefined); void load()
    }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const remove = async (id: number) => {
    try { await api.deleteAccount(system.id, id); message.success('账号已删除'); void load() }
    catch (error) { message.error(errorMessage(error)) }
  }

  return <div className="manager-section">
    <div className="section-action"><Typography.Text type="secondary">账号必须关联一个地址。仅展示元数据，密码不会被读取或回填。</Typography.Text><Button icon={<PlusOutlined />} disabled={!system.endpoints.length} onClick={() => open(null)}>新增账号</Button></div>
    {!system.endpoints.length && <Typography.Paragraph type="warning">请先在“访问地址”中配置地址，再新增系统账号。</Typography.Paragraph>}
    <Table size="small" rowKey="id" pagination={false} dataSource={accounts} columns={[{ title: '所属地址', dataIndex: 'endpoint_id', render: value => <Tag>{endpointNames.get(value) || '地址已删除'}</Tag> }, { title: '角色', dataIndex: 'role_name' }, { title: '账号', dataIndex: 'account_name' }, { title: '备注', dataIndex: 'remark', ellipsis: true, render: value => value || <span className="muted">无</span> }, { title: '状态', render: (_, row) => <Tag color={row.is_enabled ? 'success' : 'default'}>{row.is_enabled ? '启用' : '停用'}</Tag> }, { title: '', width: 92, render: (_, row) => <Space><Button type="text" icon={<EditOutlined />} onClick={() => open(row)} /><Popconfirm title="删除这个账号？" onConfirm={() => remove(row.id)}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm></Space> }]} />
    <Modal open={editing !== undefined} title={editing ? '编辑账号' : '新增账号'} onCancel={() => setEditing(undefined)} onOk={save} confirmLoading={saving} okText="保存" cancelText="取消" destroyOnHidden><Form form={form} layout="vertical" requiredMark={false}><Form.Item name="endpoint_id" label="所属地址" rules={[{ required: true, message: '请选择所属地址' }]}><Select placeholder="选择线上或测试地址" options={endpointOptions} /></Form.Item><div className="form-grid"><Form.Item name="role_name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}><Input /></Form.Item><Form.Item name="account_name" label="账号名称" rules={[{ required: true, message: '请输入账号名称' }]}><Input /></Form.Item></div><Form.Item name="password" label={editing ? '新密码（留空则不修改）' : '密码'} rules={editing ? [] : [{ required: true, message: '请输入密码' }]}><Input.Password autoComplete="new-password" /></Form.Item><Form.Item name="remark" label="账号备注"><Input placeholder="例如：生产管理员账号" maxLength={200} /></Form.Item><Form.Item name="is_enabled" label="启用账号" valuePropName="checked"><Switch /></Form.Item></Form></Modal>
  </div>
}
