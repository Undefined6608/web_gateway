import { useState } from 'react'
import { ArrowLeftOutlined, LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Form, Input, message } from 'antd'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../components/common/Brand'
import { api, auth, errorMessage } from '../services/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  if (auth.token()) return <Navigate to="/admin/systems" replace />

  const submit = async (values: { username: string; password: string }) => {
    setLoading(true)
    try { auth.save(await api.login(values)); message.success('登录成功'); navigate('/admin/systems', { replace: true }) }
    catch (error) { message.error(errorMessage(error)) }
    finally { setLoading(false) }
  }

  return <div className="login-shell">
    <aside className="login-aside"><Brand /><div className="login-copy"><span>SECURE OPERATIONS</span><h1>让每一次系统连接<br />都有迹可循。</h1><p>集中管理系统入口、负责人、开发角色与服务可用状态。</p></div><div className="network-art" aria-hidden="true"><i /><i /><i /><i /><span /><span /><span /></div><div className="login-aside-foot"><SafetyCertificateOutlined /> 管理操作通过授权会话保护</div></aside>
    <main className="login-main"><Button className="back-button" type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回系统目录</Button><div className="login-panel"><div className="login-title"><div className="login-lock"><LockOutlined /></div><h2>管理控制台</h2><p>使用管理员账号继续</p></div><Form layout="vertical" requiredMark={false} onFinish={submit} size="large"><Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}><Input prefix={<UserOutlined />} autoComplete="username" placeholder="请输入用户名" /></Form.Item><Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="请输入密码" /></Form.Item><Button type="primary" htmlType="submit" block loading={loading}>进入控制台</Button></Form><p className="security-note">生产环境仅允许通过 HTTPS 提交账号凭据</p></div></main>
  </div>
}
