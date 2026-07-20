import type { ReactNode } from 'react'

export function PageFrame({ title, description, action, children }: { title: string; description: string; action?: ReactNode; children: ReactNode }) {
  return <div className="admin-page">
    <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>
    {children}
  </div>
}
