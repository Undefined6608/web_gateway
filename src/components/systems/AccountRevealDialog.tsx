import { useCallback, useEffect, useRef, useState } from 'react'
import { CopyOutlined, EyeInvisibleOutlined, EyeOutlined, KeyOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Empty, Form, Input, Modal, Tag, Tooltip, message } from 'antd'
import axios from 'axios'
import { api, errorMessage } from '../../services/api'
import type { Endpoint, RevealedSystemAccount } from '../../types/api'

const REVEAL_SECONDS = 60

export function AccountRevealDialog({ endpoint, systemName }: { endpoint: Endpoint; systemName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<RevealedSystemAccount[]>([])
  const [authenticated, setAuthenticated] = useState(false)
  const [visibleIds, setVisibleIds] = useState<Set<number>>(() => new Set())
  const [remaining, setRemaining] = useState(REVEAL_SECONDS)
  const [form] = Form.useForm<{ username: string; password: string }>()
  const expiresAtRef = useRef(0)

  const clearSensitiveData = useCallback(() => {
    setAccounts([])
    setAuthenticated(false)
    setVisibleIds(new Set())
    setRemaining(REVEAL_SECONDS)
    expiresAtRef.current = 0
    form.resetFields()
  }, [form])

  const close = () => {
    setOpen(false)
    clearSensitiveData()
  }

  useEffect(() => {
    if (!accounts.length || !expiresAtRef.current) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0) {
        window.clearInterval(timer)
        setOpen(false)
        clearSensitiveData()
        message.info('账号密码已到期并清除')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [accounts.length, clearSensitiveData])

  useEffect(() => () => {
    expiresAtRef.current = 0
    form.resetFields()
  }, [form])

  useEffect(() => {
    const closeWhenAnotherSystemOpens = (event: Event) => {
      const openedSystemId = (event as CustomEvent<number>).detail
      if (openedSystemId !== endpoint.id) {
        setOpen(false)
        clearSensitiveData()
      }
    }
    window.addEventListener('gateway:account-reveal-open', closeWhenAnotherSystemOpens)
    return () => window.removeEventListener('gateway:account-reveal-open', closeWhenAnotherSystemOpens)
  }, [clearSensitiveData, endpoint.id])

  const authenticate = async () => {
    const credentials = await form.validateFields()
    setLoading(true)
    try {
      const revealed = await api.revealAccounts(endpoint.id, credentials)
      form.resetFields()
      setAccounts(revealed)
      setAuthenticated(true)
      setVisibleIds(new Set())
      setRemaining(REVEAL_SECONDS)
      expiresAtRef.current = Date.now() + REVEAL_SECONDS * 1000
    } catch (error) {
      form.setFieldValue('password', '')
      if (axios.isAxiosError(error) && error.response?.status === 401) message.error('认证失败，请检查管理员凭据')
      else if (axios.isAxiosError(error) && error.response?.status === 423) message.error(error.response.data?.message || '账号已封禁，请 15 分钟后重试')
      else if (axios.isAxiosError(error) && error.response?.status === 429) message.error('失败次数过多，请 5 分钟后再试')
      else message.error(errorMessage(error))
    } finally { setLoading(false) }
  }

  const toggleVisible = (id: number) => setVisibleIds(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const copyCredentials = async (account: RevealedSystemAccount) => {
    const credentials = [`地址：${endpoint.endpoint_type === 'online' ? '线上' : '测试'} · ${endpoint.url}`, `角色：${account.role_name}`, `账号：${account.account_name}`, `密码：${account.password}`, account.remark ? `备注：${account.remark}` : ''].filter(Boolean).join('\n')
    try { await navigator.clipboard.writeText(credentials); message.success('账号和密码已复制') }
    catch { message.error('复制失败，请手动复制账号和密码') }
  }

  return <>
    <Tooltip title="查看账号密码"><Button className="reveal-account-button" size="small" aria-label="查看账号密码" icon={<KeyOutlined />} onClick={() => { setOpen(true); window.dispatchEvent(new CustomEvent('gateway:account-reveal-open', { detail: endpoint.id })) }} /></Tooltip>
    <Modal className="account-reveal-modal" open={open} title={<span className="reveal-modal-title"><SafetyCertificateOutlined />{systemName}账号认证</span>} onCancel={close} footer={null} width={680} destroyOnHidden maskClosable={!loading} keyboard={!loading}>
      {!authenticated ? <div className="reveal-auth-step">
        <div className="reveal-endpoint-context"><Tag>{endpoint.endpoint_type === 'online' ? '线上地址' : '测试地址'}</Tag><div><strong>{endpoint.url}</strong><span>{endpoint.remark || '无网址备注'}</span></div></div>
        <p>输入本程序管理员凭据，验证通过后可临时查看当前地址的启用账号。</p>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={authenticate} autoComplete="off">
          <Form.Item label="管理员用户名" name="username" rules={[{ required: true, message: '请输入管理员用户名' }]}><Input prefix={<UserOutlined />} autoComplete="off" /></Form.Item>
          <Form.Item label="管理员密码" name="password" rules={[{ required: true, message: '请输入管理员密码' }]}><Input.Password prefix={<LockOutlined />} autoComplete="new-password" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>验证并查看账号</Button>
        </Form>
        <span className="reveal-security-note"><LockOutlined />凭据仅用于本次认证，不会保存或进入管理会话</span>
      </div> : <div className="revealed-accounts">
        <Alert type="warning" showIcon message={`明文将在 ${remaining} 秒后自动清除`} />
        <div className="reveal-endpoint-context reveal-endpoint-context-result"><Tag>{endpoint.endpoint_type === 'online' ? '线上地址' : '测试地址'}</Tag><div><strong>{endpoint.url}</strong><span>{endpoint.remark || '无网址备注'}</span></div></div>
        {accounts.length ? <div className="revealed-account-list">{accounts.map(account => <div className="revealed-account" key={account.id}>
          <div className="revealed-account-meta"><div className="revealed-account-context"><span>{account.role_name}</span></div><strong>{account.account_name}</strong>{account.remark && <small>{account.remark}</small>}</div>
          <div className="revealed-password"><span>密码</span><div className="revealed-password-row"><code>{visibleIds.has(account.id) ? account.password : '••••••••••••'}</code><Tooltip title={visibleIds.has(account.id) ? '隐藏密码' : '显示密码'}><Button type="text" aria-label={visibleIds.has(account.id) ? '隐藏密码' : '显示密码'} icon={visibleIds.has(account.id) ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => toggleVisible(account.id)} /></Tooltip></div></div><div className="revealed-copy-zone"><Tooltip title="复制账号密码"><Button className="revealed-copy-action" type="text" aria-label="复制账号密码" icon={<CopyOutlined />} onClick={() => copyCredentials(account)} /></Tooltip></div>
        </div>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前地址暂无可用账号" />}
        <Button onClick={close} block>关闭并清除</Button>
      </div>}
    </Modal>
  </>
}
