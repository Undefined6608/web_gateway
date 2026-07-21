export type LifecycleStatus = 'normal' | 'maintenance' | 'closed'
export type EndpointType = 'online' | 'test'
export type CheckStatus = 'unknown' | 'healthy' | 'unhealthy'
export type DeveloperType = 'page' | 'backend' | 'data'

export interface Person {
  id: number
  name: string
  email: string | null
  phone: string | null
  created_at?: string
  updated_at?: string
}

export interface Endpoint {
  id: number
  system_id: number
  endpoint_type: EndpointType
  url: string
  check_status: CheckStatus
  last_http_status: number | null
  last_response_time_ms: number | null
  last_checked_at: string | null
  last_error: string | null
  created_at?: string
  updated_at?: string
}

export interface Developer {
  person: Pick<Person, 'id' | 'name'>
  developer_type: DeveloperType
}

export interface GatewaySystem {
  id: number
  name: string
  requires_vpn: boolean
  is_internal_network: boolean
  lifecycle_status: LifecycleStatus
  owner_id: number | null
  description: string | null
  owner: Pick<Person, 'id' | 'name'> | null
  developers: Developer[]
  endpoints: Endpoint[]
  created_at?: string
  updated_at?: string
}

export interface SystemAccount {
  id: number
  system_id: number
  role_name: string
  account_name: string
  is_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface RevealedSystemAccount {
  id: number
  role_name: string
  account_name: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: { id: number; username: string; display_name: string }
}

export interface ImportSummary {
  systems: number
  endpoints: number
  accounts: number
  people: number
  developers: number
}

export interface ApiErrorBody { error?: string; message?: string }
