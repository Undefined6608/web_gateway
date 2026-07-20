import { Skeleton } from 'antd'

export function PageLoader() {
  return <div className="route-loader"><Skeleton active paragraph={{ rows: 6 }} /></div>
}
