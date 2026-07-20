import { useEffect, useState } from 'react'
import { ApartmentOutlined, GlobalOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Dropdown, Layout, Menu } from 'antd'
import type { MenuProps } from 'antd'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/common/Brand'
import { api, auth } from '../services/api'

const { Content, Header, Sider } = Layout

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const handleUnauthorized = () => navigate('/login', { replace: true })
    window.addEventListener('gateway:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('gateway:unauthorized', handleUnauthorized)
  }, [navigate])
  if (!auth.token()) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const logout = async () => {
    try { await api.logout() } catch { /* Local logout still applies. */ }
    finally { auth.clear(); navigate('/login', { replace: true }) }
  }
  const menu: MenuProps['items'] = [
    { key: '/admin/systems', icon: <ApartmentOutlined />, label: '系统管理' },
    { key: '/admin/people', icon: <TeamOutlined />, label: '人员管理' },
  ]

  return <Layout className="admin-shell">
    <Sider width={232} collapsedWidth={72} collapsed={collapsed} trigger={null} className="admin-sider"><Brand compact={collapsed} /><Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menu} onClick={({ key }) => navigate(key)} /><div className="sider-foot"><Button type="text" icon={<GlobalOutlined />} onClick={() => navigate('/')}>{!collapsed && '查看系统目录'}</Button></div></Sider>
    <Layout><Header className="admin-header"><Button type="text" aria-label={collapsed ? '展开导航' : '收起导航'} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} /><div className="header-right"><span className="env-badge"><i />网关服务</span><Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}><Button type="text" className="user-button"><span className="avatar">{auth.user()?.display_name?.slice(0, 1) || '管'}</span><span>{auth.user()?.display_name || '管理员'}</span></Button></Dropdown></div></Header><Content className="admin-content"><Outlet /></Content></Layout>
  </Layout>
}
