import { lazy, Suspense } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from './components/common/PageLoader'
import { APP_BASE_PATH } from './config/app'
import { theme } from './config/theme'
import './App.css'

const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(module => ({ default: module.AdminLayout })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })))
const PublicSystemsPage = lazy(() => import('./pages/PublicSystemsPage').then(module => ({ default: module.PublicSystemsPage })))
const PeopleAdminPage = lazy(() => import('./pages/admin/PeopleAdminPage').then(module => ({ default: module.PeopleAdminPage })))
const SystemsAdminPage = lazy(() => import('./pages/admin/SystemsAdminPage').then(module => ({ default: module.SystemsAdminPage })))

export default function App() {
  return <ConfigProvider theme={theme}><AntApp><BrowserRouter basename={APP_BASE_PATH}><Suspense fallback={<PageLoader />}><Routes>
    <Route path="/" element={<PublicSystemsPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/admin" element={<AdminLayout />}><Route index element={<Navigate to="systems" replace />} /><Route path="systems" element={<SystemsAdminPage />} /><Route path="people" element={<PeopleAdminPage />} /></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter></AntApp></ConfigProvider>
}
