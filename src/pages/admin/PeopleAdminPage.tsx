import { useCallback, useEffect, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from 'antd'
import { PageFrame } from '../../components/common/PageFrame'
import { api, errorMessage } from '../../services/api'
import type { Person } from '../../types/api'

export function PeopleAdminPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Person | null | undefined>(undefined)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => { setLoading(true); try { setPeople(await api.people()) } catch (error) { message.error(errorMessage(error)) } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const open = (person: Person | null) => { setEditing(person); form.setFieldsValue(person || { name: '', email: '', phone: '' }) }
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (editing) await api.updatePerson(editing.id, values)
      else await api.createPerson(values)
      message.success('人员信息已保存'); setEditing(undefined); void load()
    }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  const remove = async (id: number) => {
    try { await api.deletePerson(id); message.success('人员已删除'); void load() }
    catch (error) { message.error(errorMessage(error)) }
  }

  return <PageFrame title="人员管理" description="维护负责人和各类开发人员基础信息" action={<Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>新增人员</Button>}>
    <div className="content-panel"><Table rowKey="id" loading={loading} dataSource={people} pagination={false} columns={[{ title: '姓名', dataIndex: 'name', render: name => <span className="person-name"><span>{name.slice(0, 1)}</span><strong>{name}</strong></span> }, { title: '邮箱', dataIndex: 'email', render: value => value || <span className="muted">未填写</span> }, { title: '电话', dataIndex: 'phone', render: value => value || <span className="muted">未填写</span> }, { title: '操作', width: 112, render: (_, row) => <Space><Button type="text" icon={<EditOutlined />} onClick={() => open(row)} /><Popconfirm title="删除人员？" description="请确保已解除该人员的系统关联。" onConfirm={() => remove(row.id)}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm></Space> }]} /></div>
    <Modal open={editing !== undefined} title={editing ? '编辑人员' : '新增人员'} onCancel={() => setEditing(undefined)} onOk={save} confirmLoading={saving} okText="保存" cancelText="取消" destroyOnHidden><Form form={form} layout="vertical" requiredMark={false}><Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item><Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱' }]}><Input /></Form.Item><Form.Item name="phone" label="电话"><Input /></Form.Item></Form></Modal>
  </PageFrame>
}
