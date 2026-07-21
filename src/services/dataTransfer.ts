import { APP_BASE_PATH } from '../config/app'
import { auth } from './api'
import type { ApiErrorBody, ImportSummary } from '../types/api'

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

export class DataTransferError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'DataTransferError'
    this.status = status
  }
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = auth.token()
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${APP_BASE_PATH}${path}`, { ...init, headers })
  if (response.status === 401) {
    auth.clear()
    window.dispatchEvent(new Event('gateway:unauthorized'))
  }
  return response
}

async function responseError(response: Response, fallback: string) {
  if (response.status === 413) return new DataTransferError('文件不能超过 10 MB', 413)
  try {
    const body = await response.json() as ApiErrorBody
    return new DataTransferError(body.message || fallback, response.status)
  } catch {
    return new DataTransferError(fallback, response.status)
  }
}

function responseFilename(response: Response, fallback: string) {
  const disposition = response.headers.get('Content-Disposition') || ''
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match) return decodeURIComponent(utf8Match[1].replace(/["']/g, ''))
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || fallback
}

async function download(path: string, fallbackFilename: string, failureMessage: string) {
  const response = await adminFetch(path)
  if (!response.ok) throw await responseError(response, failureMessage)

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = responseFilename(response, fallbackFilename)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const dataTransferService = {
  downloadTemplate: () => download('/api/admin/import/template', 'systems-import-template.xlsx', '模板下载失败'),
  exportSystems: () => download('/api/admin/export', 'systems-export.xlsx', '系统数据导出失败'),
  importSystems: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await adminFetch('/api/admin/import', { method: 'POST', body: formData })
    if (!response.ok) throw await responseError(response, '系统数据导入失败')
    return response.json() as Promise<ImportSummary>
  },
}
