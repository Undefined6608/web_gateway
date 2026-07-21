import { useState } from 'react'
import { CheckCircleFilled, DownloadOutlined, ExportOutlined, FileExcelOutlined, ImportOutlined } from '@ant-design/icons'
import { Button, Modal, Upload, message } from 'antd'
import type { UploadProps } from 'antd'
import { DataTransferError, MAX_IMPORT_FILE_SIZE, dataTransferService } from '../../services/dataTransfer'
import type { ImportSummary } from '../../types/api'

const summaryLabels: Array<[keyof ImportSummary, string]> = [
  ['systems', '系统'], ['endpoints', '地址'], ['accounts', '账号'], ['people', '人员'], ['developers', '开发关系'],
]
const allowedMimeTypes = new Set([
  '',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'application/zip',
])

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function DataTransferActions({ onImported }: { onImported: () => void | Promise<void> }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      message.error('只允许上传 .xlsx 文件')
      return Upload.LIST_IGNORE
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      message.error('文件不能超过 10 MB')
      return Upload.LIST_IGNORE
    }
    if (!allowedMimeTypes.has(file.type.toLowerCase())) {
      message.error('文件 MIME 类型与 XLSX 不匹配')
      return Upload.LIST_IGNORE
    }
    try {
      const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer())
      const isZipContainer = signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04
      if (!isZipContainer) {
        message.error('文件不是有效的 XLSX 压缩容器')
        return Upload.LIST_IGNORE
      }
    } catch {
      message.error('无法读取文件，请重新选择')
      return Upload.LIST_IGNORE
    }
    setSelectedFile(file)
    setConfirmOpen(true)
    return false
  }

  const downloadTemplate = async () => {
    setTemplateLoading(true)
    try { await dataTransferService.downloadTemplate(); message.success('模板下载已开始') }
    catch (error) { message.error(error instanceof Error ? error.message : '模板下载失败') }
    finally { setTemplateLoading(false) }
  }

  const exportSystems = async () => {
    setExportLoading(true)
    try { await dataTransferService.exportSystems(); message.success('系统数据导出已开始') }
    catch (error) { message.error(error instanceof Error ? error.message : '系统数据导出失败') }
    finally { setExportLoading(false) }
  }

  const importSystems = async () => {
    if (!selectedFile) return
    setImporting(true)
    try {
      const result = await dataTransferService.importSystems(selectedFile)
      setSummary(result)
      setSelectedFile(null)
      setConfirmOpen(false)
      message.success('系统数据导入完成')
      await onImported()
    } catch (error) {
      const fallback = error instanceof DataTransferError || error instanceof Error ? error.message : '系统数据导入失败'
      message.error(fallback)
    } finally { setImporting(false) }
  }

  const cancelImport = () => {
    if (importing) return
    setConfirmOpen(false)
    setSelectedFile(null)
  }

  return <div className="data-transfer-actions">
    <Button icon={<DownloadOutlined />} loading={templateLoading} onClick={downloadTemplate}>下载模板</Button>
    <Upload accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" maxCount={1} beforeUpload={beforeUpload} showUploadList={false} disabled={importing}>
      <Button icon={<ImportOutlined />} loading={importing}>导入数据</Button>
    </Upload>
    <Button icon={<ExportOutlined />} loading={exportLoading} onClick={exportSystems}>导出数据</Button>

    <Modal open={confirmOpen} title="确认导入系统数据" okText="开始导入" cancelText="取消" confirmLoading={importing} onOk={importSystems} onCancel={cancelImport} closable={!importing} maskClosable={!importing} keyboard={!importing}>
      {selectedFile && <div className="import-confirm-file"><FileExcelOutlined /><div><span>即将导入</span><strong>{selectedFile.name}</strong><small>{formatSize(selectedFile.size)}</small></div></div>}
      <p className="import-confirm-note">导入会根据模板内容新增或覆盖系统数据。文件将在内存中处理，任何校验或写入错误都会使本次操作整体回滚。地址导入成功后自动检测，检测异常不会回滚基础数据。</p>
      <div className="import-security-checks"><strong>服务端安全检查</strong><ul><li>校验文件名、MIME、XLSX 签名和规定的 5 个 Sheet</li><li>禁止隐藏 Sheet、公式、宏、ActiveX、OLE、外部链接和自定义 XML</li><li>限制 ZIP 条目数量、单项与总解压大小</li><li>拒绝路径穿越、重复路径和符号链接</li></ul></div>
    </Modal>

    <Modal open={!!summary} title={<span className="import-success-title"><CheckCircleFilled />导入完成</span>} footer={<Button type="primary" onClick={() => setSummary(null)}>完成</Button>} onCancel={() => setSummary(null)}>
      <p className="import-success-copy">系统列表已刷新，本次写入数量如下：</p>
      {summary && <div className="import-summary">{summaryLabels.map(([key, label]) => <div key={key}><span>{label}</span><strong>{summary[key]}</strong></div>)}</div>}
    </Modal>
  </div>
}
