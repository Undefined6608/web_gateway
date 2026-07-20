import { useEffect, useState } from 'react'
import { Button, Select, message } from 'antd'
import { developerLabels } from '../../config/systemMeta'
import { api, errorMessage } from '../../services/api'
import type { DeveloperType, GatewaySystem, Person } from '../../types/api'

export function DeveloperManager({ system, people, onChanged }: { system: GatewaySystem; people: Person[]; onChanged: () => void }) {
  const [values, setValues] = useState<Record<DeveloperType, number[]>>({ page: [], backend: [], data: [] })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setValues({ page: system.developers.filter(d => d.developer_type === 'page').map(d => d.person.id), backend: system.developers.filter(d => d.developer_type === 'backend').map(d => d.person.id), data: system.developers.filter(d => d.developer_type === 'data').map(d => d.person.id) })
  }, [system])
  const save = async () => {
    setSaving(true)
    try { await api.updateDevelopers(system.id, (Object.entries(values) as [DeveloperType, number[]][]).flatMap(([type, ids]) => ids.map(person_id => ({ person_id, developer_type: type })))); message.success('开发人员配置已保存'); onChanged() }
    catch (error) { message.error(errorMessage(error)) }
    finally { setSaving(false) }
  }
  return <div className="manager-section developer-manager">
    {(['page', 'backend', 'data'] as DeveloperType[]).map(type => <div key={type}><label>{developerLabels[type]}开发</label><Select mode="multiple" value={values[type]} onChange={ids => setValues(current => ({ ...current, [type]: ids }))} placeholder={`选择${developerLabels[type]}开发人员`} options={people.map(p => ({ value: p.id, label: p.name }))} /></div>)}
    <Button type="primary" loading={saving} onClick={save}>保存配置</Button>
  </div>
}
