import { CloudServerOutlined } from '@ant-design/icons'
import { Drawer, Tabs } from 'antd'
import type { GatewaySystem, Person } from '../../types/api'
import { AccountManager } from './AccountManager'
import { DeveloperManager } from './DeveloperManager'
import { EndpointManager } from './EndpointManager'

export function SystemDetailDrawer({ system, people, open, onClose, onChanged }: { system: GatewaySystem | null; people: Person[]; open: boolean; onClose: () => void; onChanged: () => void }) {
  return <Drawer width={720} open={open} onClose={onClose} title={system ? <div className="drawer-title"><CloudServerOutlined /><span>{system.name}<small>系统配置</small></span></div> : ''} destroyOnHidden>
    {system && <Tabs items={[
      { key: 'endpoints', label: '访问地址', children: <EndpointManager system={system} onChanged={onChanged} /> },
      { key: 'developers', label: '开发人员', children: <DeveloperManager system={system} people={people} onChanged={onChanged} /> },
      { key: 'accounts', label: '系统账号', children: <AccountManager system={system} /> },
    ]} />}
  </Drawer>
}
