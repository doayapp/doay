import { useState, useEffect } from 'react'
import {
    Card, Chip, Dialog, Stack, Typography, TextField, Button, Tooltip, IconButton,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddIcon from '@mui/icons-material/Add'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import EditSquareIcon from '@mui/icons-material/EditSquare'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import DeleteIcon from '@mui/icons-material/Delete'

import { useAlertDialog } from "../component/useAlertDialog.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { readDnsTableList, saveDnsTableList } from "../util/invoke.ts"
import { processIP } from "../util/util.ts"
import { decodeBase64, encodeBase64, hashJson, safeJsonParse } from "../util/crypto.ts"
import { clipboardWriteText } from "../util/tauri.ts"
import { DEFAULT_DNS_TABLE_LIST } from "../util/config.ts"
import { useDebounce } from "../hook/useDebounce.ts"

const DEFAULT_DNS_TABLE_ROW: DnsTableRow = {
    name: '',
    note: '',
    hash: '',
    IPv4: '',
    IPv6: '',
    DoH: '',
    DoT: '',
}

export const DnsTable = () => {
    const [loading, setLoading] = useState(true)
    const [dnsTableList, setDnsTableList] = useState<DnsTableList>([])
    const loadList = useDebounce(async () => {
        const tableList = await readDnsTableList() as DnsTableList || DEFAULT_DNS_TABLE_LIST
        setDnsTableList(tableList)
        setTimeout(() => setLoading(false), 200)
    }, 100)
    useEffect(loadList, [])

    const [action, setAction] = useState('')
    const [row, setRow] = useState<DnsTableRow>(DEFAULT_DNS_TABLE_ROW)
    const [nameError, setNameError] = useState(false)
    const [updateKey, setUpdateKey] = useState(-1)

    const handleRowChange = (type: keyof DnsTableRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRow(prev => {
            const value = e.target.value
            type === 'name' && setNameError(value === '')
            return {...prev, [type]: value}
        })
    }

    const handleBack = () => {
        setAction('')
        setDnsTableImportData('')
        setDnsTableExportData('')
        setUpdateKey(-1)
    }

    // ============================== create & update ==============================
    const handleCreate = () => {
        setAction('create')
        setUpdateKey(-1)
        setRow(DEFAULT_DNS_TABLE_ROW)
    }

    const handleUpdate = (key: number) => {
        setAction('update')
        setUpdateKey(key)
        const row = dnsTableList[key]
        if (row) setRow(row)
    }

    const handleSubmit = async () => {
        let item: DnsTableRow = {...row}

        item.name = item.name.trim()
        const isEmpty = item.name === ''
        setNameError(isEmpty)
        if (isEmpty) return

        item.note = item.note.trim()
        item.hash = ''
        item.IPv4 = processIP(item.IPv4, false)
        item.IPv6 = processIP(item.IPv6, false)
        item.DoH = item.DoH.trim()
        item.DoT = item.DoT.trim()
        item.hash = await hashJson(item)

        updateKey === -1 ? dnsTableList.push(item) : dnsTableList[updateKey] = item
        const ok = await saveDnsTableList(dnsTableList)
        if (!ok) {
            showAlertDialog('保存失败')
            return
        }
        setDnsTableList([...dnsTableList])
        handleBack()
    }

    // ============================== import ==============================
    const [errorImportData, setErrorImportData] = useState(false)
    const [dnsTableImportData, setDnsTableImportData] = useState('')
    const handleImport = () => {
        setAction('import')
    }

    const handleDnsTableImportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        setDnsTableImportData(value)
        setErrorImportData(value === '')
    }

    const handleDnsTableImportSubmit = async () => {
        let s = dnsTableImportData.trim()
        setErrorImportData(!s)
        if (!s) return

        const newDnsTableList = [...dnsTableList]
        let okNum = 0
        let existNum = 0
        let errNum = 0
        let errMsg = ''
        const arr = s.split('\n')
        for (let v of arr) {
            v = v.trim()
            if (v.length === 0) continue

            if (v.startsWith('doayPublicDns://')) {
                const base64 = v.substring(16).replace(/#.*$/, '')
                const decoded = decodeBase64(base64)
                const data = safeJsonParse(decoded)
                if (data && typeof data === 'object' && 'hash' in data) {
                    if (newDnsTableList.some(item => item.hash === data.hash)) {
                        existNum++
                    } else {
                        newDnsTableList.push(data)
                        okNum++
                    }
                } else {
                    errNum++
                    errMsg = '解析失败，或数据不正确'
                }
            } else {
                errNum++
                errMsg = '格式不正确，前缀非 doayPublicDns:// 开头'
            }
        }

        if (okNum > 0) {
            const ok = await saveDnsTableList(newDnsTableList)
            if (!ok) {
                showAlertDialog('导入保存失败')
                return
            }
            setDnsTableList(newDnsTableList)
            handleBack()

            if (existNum > 0 || errNum > 0) {
                showAlertDialog(`导入成功 ${okNum} 条，已存在 ${existNum} 条，失败 ${errNum} 条`, 'warning')
            } else {
                showAlertDialog(`导入成功 ${okNum} 条`, 'success')
            }
        } else if (existNum > 0) {
            showAlertDialog(`导入成功 ${okNum} 条，已存在 ${existNum} 条，失败 ${errNum} 条`, 'warning')
        } else if (errMsg) {
            showAlertDialog(errMsg, 'error')
        }
    }

    // ============================== export ==============================
    const [dnsTableExportData, setDnsTableExportData] = useState('')
    const handleExport = () => {
        setAction('export')

        let arr = []
        for (let k = 0; k < dnsTableList.length; k++) {
            const v = dnsTableList[k]
            const encoded = 'doayPublicDns://' + encodeBase64(JSON.stringify(v)) + '#' + v.name
            arr.push(encoded)
        }
        setDnsTableExportData(arr.join('\n'))
    }

    // ============================== sort ==============================
    const [sortKey, setSortKey] = useState(-1)
    const handleSortStart = (e: React.MouseEvent, key: number) => {
        e.stopPropagation()
        if (sortKey === -1) {
            setSortKey(key)
        } else if (sortKey === key) {
            setSortKey(-1)
        } else {
            handleSortEnd(key).catch(_ => 0)
        }
    }

    const handleSortEnd = async (key: number) => {
        if (sortKey === -1) return
        if (sortKey === key) {
            setSortKey(-1)
            return
        }

        let newList = [...dnsTableList]
        let [temp] = newList.splice(sortKey, 1)
        newList.splice(key, 0, temp)
        setSortKey(-1)

        const ok = await saveDnsTableList(newList)
        if (!ok) {
            showAlertDialog('保存排序失败', 'error')
        } else {
            setDnsTableList([...newList])
        }
    }

    // ============================== close dialog ==============================
    const handleClose = (_?: any, reason?: string) => {
        if (reason === 'backdropClick') return
        handleBack()
    }

    // ============================== delete ==============================
    const handleDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 "${name}" 吗？`, async () => {
            const newList = dnsTableList.filter((_, index) => index !== key) || []
            const ok = await saveDnsTableList(newList)
            if (!ok) {
                showAlertDialog('删除失败')
            } else {
                setDnsTableList([...newList])
            }
        })
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleDnsTableCopy = async (content: string) => {
        const ok = await clipboardWriteText(content)
        if (!ok) return
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const {AlertDialogComponent, showAlertDialog} = useAlertDialog()
    const {DialogComponent, dialogConfirm} = useDialog()
    return (<>
        <AlertDialogComponent/>
        <DialogComponent/>
        <Dialog open={action !== ''} onClose={handleClose}>
            <Stack spacing={2} sx={{p: 2, minWidth: 580}}>
                {action === 'create' || action === 'update' ? <>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField fullWidth size="small" label="公共 DNS 服务商名称"
                                   error={nameError} helperText={nameError ? "名称不能为空" : ""}
                                   value={row.name} onChange={handleRowChange('name')}/>
                        <TextField fullWidth size="small" label="公共 DNS 服务商描述" value={row.note} multiline minRows={2} maxRows={6} onChange={handleRowChange('note')}/>
                        <TextField fullWidth size="small" label="IPv4 地址 (每行一条)" value={row.IPv4} multiline minRows={2} maxRows={6} onChange={handleRowChange('IPv4')}/>
                        <TextField fullWidth size="small" label="IPv6 地址 (每行一条)" value={row.IPv6} multiline minRows={2} maxRows={6} onChange={handleRowChange('IPv6')}/>
                        <TextField fullWidth size="small" label="DoH (DNS over HTTPS)" value={row.DoH} onChange={handleRowChange('DoH')}/>
                        <TextField fullWidth size="small" label="DoT (DNS over TLS)" value={row.DoT} onChange={handleRowChange('DoT')}/>
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleSubmit}>{action === 'create' ? '添加' : '修改'}</Button>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </> : action === 'import' ? <>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField
                            size="small" multiline rows={10}
                            label="导入内容（URI）"
                            placeholder="每行一条，例如：doayPublicDns://xxxxxx"
                            error={errorImportData} helperText={errorImportData ? '导入内容不能为空' : ''}
                            value={dnsTableImportData}
                            onChange={handleDnsTableImportDataChange}
                        />
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleDnsTableImportSubmit}>确定</Button>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </> : action === 'export' && <>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField size="small" multiline disabled minRows={10} maxRows={16} label="导出内容（URI）" value={dnsTableExportData}/>
                    </Stack>
                    <div className="flex-between">
                        <div>
                            <Button variant="contained" color="info" startIcon={<ContentCopyIcon/>} onClick={() => handleDnsTableCopy(dnsTableExportData)}>复制</Button>
                            {isCopied && <Chip label="复制成功" color="success" size="small" sx={{ml: 2}}/>}
                        </div>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </>}
            </Stack>
        </Dialog>

        <Stack direction="row" spacing={1}>
            <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleCreate}>添加</Button>
            <Button variant="contained" color="success" startIcon={<FileUploadIcon/>} onClick={handleImport}>导入</Button>
            <Button variant="contained" color="warning" startIcon={<FileDownloadIcon/>} onClick={handleExport}>导出</Button>
        </Stack>
        <Stack spacing={1}>
            {loading ? (
                <LoadingCard height="160px" elevation={5}/>
            ) : dnsTableList.length === 0 ? (
                <ErrorCard errorMsg="暂无内容" height="160px" elevation={5}/>
            ) : dnsTableList.map((row, key) => (
                <Card
                    key={key} elevation={5} sx={{p: 1}}
                    className={sortKey > -1 ? (sortKey === key ? 'sort-current' : 'sort-target') : ''}
                    onClick={() => handleSortEnd(key)}
                >
                    <div className="flex-between">
                        <Typography variant="h6">{key + 1}. {row.name}</Typography>
                        <div>
                            <Tooltip arrow title="排序" placement="top">
                                <IconButton color="info" onClick={e => handleSortStart(e, key)}><OpenWithIcon/></IconButton>
                            </Tooltip>
                            <Tooltip arrow title="修改" placement="top">
                                <IconButton color="primary" onClick={() => handleUpdate(key)}><EditSquareIcon/></IconButton>
                            </Tooltip>
                            <Tooltip arrow title="删除" placement="top">
                                <IconButton color="error" onClick={() => handleDelete(key, row.name)}><DeleteIcon/></IconButton>
                            </Tooltip>
                        </div>
                    </div>
                    <Typography variant="body2" sx={{color: 'text.secondary', pl: '3px', pb: 2}}>{row.note}</Typography>
                    <Stack spacing={2}>
                        {row.IPv4 && <TextField fullWidth size="small" label="IPv4 地址" value={row.IPv4} multiline/>}
                        {row.IPv6 && <TextField fullWidth size="small" label="IPv6 地址" value={row.IPv6} multiline/>}
                        {row.DoH && <TextField fullWidth size="small" label="DoH (DNS over HTTPS)" value={row.DoH}/>}
                        {row.DoT && <TextField fullWidth size="small" label="DoT (DNS over TLS)" value={row.DoT}/>}
                    </Stack>
                </Card>
            ))}
        </Stack>
    </>)
}
