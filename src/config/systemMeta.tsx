import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled } from '@ant-design/icons'
import type { DeveloperType, LifecycleStatus } from '../types/api'

export const statusMeta: Record<LifecycleStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'success' },
  maintenance: { label: '维护', color: 'warning' },
  closed: { label: '已关闭', color: 'default' },
}

export const checkMeta = {
  unknown: { label: '未检测', icon: <ClockCircleOutlined />, color: 'default' },
  healthy: { label: '正常', icon: <CheckCircleFilled />, color: 'success' },
  unhealthy: { label: '异常', icon: <CloseCircleFilled />, color: 'error' },
}

export const developerLabels: Record<DeveloperType, string> = {
  page: '页面', backend: '后端', data: '数据',
}
