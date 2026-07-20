import { useEffect, useState } from 'react'
import { Form, Input, Modal, Select, Switch, message } from 'antd'
import { statusMeta } from '../../config/systemMeta'
import { api, errorMessage } from '../../services/api'
import type { GatewaySystem, Person } from '../../types/api'

type SystemFormValue = Pick<GatewaySystem, 'name' | 'description' | 'owner_id' | 'requires_vpn' | 'is_internal_network' | 'lifecycle_status'>

export function SystemEditor({ open, system, people, onClose, onSaved }: { open: boolean; system: GatewaySystem | null; people: Person[]; onClose: () => void; onSaved: () => void }) {
  const [form] = Form.useForm<SystemFormValue>()
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) form.setFieldsValue(system ? { ...system } : { lifecycle_status: 'normal', requires_vpn: false, is_internal_network: false, owner_id: null }) }, [open, system, form])
  const submit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (system) await api.updateSystem(system.id, values)
      else await api.createSystem(values)
      message.success(system ? '系统已更新' : '系统已创建'); onSaved(); onClose()
    }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <Modal open={open} title={system ? '编辑系统' : '新增系统'} onCancel={onClose} onOk={submit} okText="保存" cancelText="取消" confirmLoading={saving} destroyOnHidden><Form form={form} layout="vertical" requiredMark={false}><Form.Item name="name" label="系统名称" rules={[{ required: true, message: '请输入系统名称' }]}><Input placeholder="例如：订单管理系统" /></Form.Item><Form.Item name="description" label="系统说明"><Input.TextArea rows={3} placeholder="简要说明系统用途" /></Form.Item><div className="form-grid"><Form.Item name="owner_id" label="负责人"><Select allowClear placeholder="选择负责人" options={people.map(p => ({ value: p.id, label: p.name }))} /></Form.Item><Form.Item name="lifecycle_status" label="系统状态"><Select options={Object.entries(statusMeta).map(([value, item]) => ({ value, label: item.label }))} /></Form.Item></div><div className="switch-row"><Form.Item name="requires_vpn" label="需要 VPN" valuePropName="checked"><Switch /></Form.Item><Form.Item name="is_internal_network" label="公司内网" valuePropName="checked"><Switch /></Form.Item></div></Form></Modal>
}
