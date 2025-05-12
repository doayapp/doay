import { useState, useEffect } from 'react'
import {
    Alert, Button, Chip, Card, Checkbox, Dialog, Stack, BottomNavigation, BottomNavigationAction, Paper,
    TableContainer, Table, TableRow, TableCell, TableBody, Tooltip, IconButton,
    Typography, Switch, TextField, MenuItem,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SettingsIcon from '@mui/icons-material/Settings'
import TuneIcon from '@mui/icons-material/Tune'
import ListIcon from '@mui/icons-material/List'
import AddIcon from '@mui/icons-material/Add'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'

import { JsonCodeViewer } from "../component/CodeViewer.tsx"
import { useAlertDialog } from "../component/useAlertDialog.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { DnsModeEditor } from "./DnsModeEditor.tsx"
import { DnsTable } from "./DnsTable.tsx"
import { readDnsConfig, readDnsModeList, saveDnsConfig, saveDnsModeList } from "../util/invoke.ts"
import { decodeBase64, encodeBase64, hashJson, safeJsonParse } from "../util/crypto.ts"
import { clipboardWriteText } from "../util/tauri.ts"
import { DEFAULT_DNS_CONFIG, DEFAULT_DNS_MODE_LIST, DEFAULT_DNS_MODE_ROW } from "../util/config.ts"
import { dnsModeToConf } from "../util/dns.ts"
import { saveRayDns } from "../util/ray.ts"
import { useDebounce } from "../hook/useDebounce.ts"

export const Dns = () => {
    const [loading, setLoading] = useState(true)
    const [dnsNav, setDnsNav] = useState(0)
    const [dnsConfig, setDnsConfig] = useState<DnsConfig>(DEFAULT_DNS_CONFIG)
    const [dnsModeList, setDnsModeList] = useState<DnsModeList>(DEFAULT_DNS_MODE_LIST)
    const loadList = useDebounce(async () => {
        const newDnsConfig = await readDnsConfig() as DnsConfig
        if (newDnsConfig) setDnsConfig(newDnsConfig)

        const newDnsModeList = await readDnsModeList() as DnsModeList
        if (newDnsModeList) setDnsModeList(newDnsModeList)
        setLoading(false)
    }, 100)
    useEffect(loadList, [])

    // ============================== setting ==============================
    const handleDnsEnabled = async (checked: boolean) => {
        const newConf = {...dnsConfig, enable: checked}
        setDnsConfig(newConf)
        await updateDnsConfig(newConf)
    }

    const handleDnsModeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newConf = {...dnsConfig, mode: Number(e.target.value)}
        setDnsConfig(newConf)
        await updateDnsConfig(newConf)
    }

    const updateDnsConfig = async (dnsConfig: DnsConfig) => {
        const ok = await saveDnsConfig(dnsConfig)
        if (!ok) {
            showAlertDialog('设置失败', 'error')
            return
        }

        await saveRayDns(dnsConfig, dnsModeList)
    }

    // ============================== base ==============================
    const [action, setAction] = useState('')
    const [row, setRow] = useState<DnsModeRow>(DEFAULT_DNS_MODE_ROW)
    const [nameError, setNameError] = useState(false)

    const handleRowChange = (type: keyof DnsTableRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRow(prev => {
            const value = e.target.value
            type === 'name' && setNameError(value === '')
            return {...prev, [type]: value}
        })
    }

    const handleBack = () => {
        setAction('')
        setErrorImportData(false)
        setDnsModeImportData('')
        setDnsModeExportData('')
        setDnsModeUpdateKey(-1)
        setDnsModeChecked([])
    }

    // ============================== create ==============================
    const handleCreate = () => {
        setAction('create')
        setRow(DEFAULT_DNS_MODE_ROW)
    }

    const handleCreateSubmit = async () => {
        let item: DnsModeRow = {...row}

        item.name = item.name.trim()
        const isNameEmpty = item.name === ''
        setNameError(isNameEmpty)
        if (isNameEmpty) return

        item.note = item.note.trim()
        item.hash = await hashJson(item)

        dnsModeList.push(item)
        const ok = await saveDnsModeList(dnsModeList)
        if (!ok) {
            showAlertDialog('添加保存失败')
            return
        }
        setDnsModeList([...dnsModeList])
        handleBack()
    }

    // ============================== import ==============================
    const handleImport = () => {
        setAction('import')
    }

    const [dnsModeImportData, setDnsModeImportData] = useState('')
    const [errorImportData, setErrorImportData] = useState(false)
    const handleDnsModeImportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        setDnsModeImportData(value)
        setErrorImportData(value === '')
    }

    const handleDnsModeImportSubmit = async () => {
        let s = dnsModeImportData.trim()
        setErrorImportData(!s)
        if (!s) return

        const newDnsModeList = [...dnsModeList]
        let okNum = 0
        let existNum = 0
        let errNum = 0
        let errMsg = ''
        const arr = s.split('\n')
        for (let v of arr) {
            v = v.trim()
            if (v.length === 0) continue

            if (v.startsWith('doayDns://')) {
                const base64 = v.substring(10).replace(/#.*$/, '')
                const decoded = decodeBase64(base64)
                const data = safeJsonParse(decoded)
                if (data && typeof data === 'object' && 'hash' in data) {
                    if (newDnsModeList.some(item => item.hash === data.hash)) {
                        existNum++
                    } else {
                        newDnsModeList.push(data)
                        okNum++
                    }
                } else {
                    errNum++
                    errMsg = '解析失败，或数据不正确'
                }
            } else {
                errNum++
                errMsg = '格式不正确，前缀非 doayDns:// 开头'
            }
        }

        if (okNum > 0) {
            const ok = await saveDnsModeList(newDnsModeList)
            if (!ok) {
                showAlertDialog('导入保存失败')
                return
            }
            setDnsModeList(newDnsModeList)
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
    const [dnsModeExportData, setDnsModeExportData] = useState('')
    const [dnsModeChecked, setDnsModeChecked] = useState<number[]>([])
    const handleExport = () => {
        setAction('export')

        let arr = []
        for (let k = 0; k < dnsModeChecked.length; k++) {
            const v = dnsModeList[k]
            if (!v) continue
            const encoded = 'doayDns://' + encodeBase64(JSON.stringify(v)) + '#' + v.name
            arr.push(encoded)
        }
        setDnsModeExportData(arr.join('\n'))
    }

    const handleDnsModeCheckedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDnsModeChecked(prev => {
            const value = Number(e.target.value)
            if (e.target.checked) {
                return [...prev, value]
            } else {
                return prev.filter(item => item !== value)
            }
        })
    }

    // ============================== update ==============================
    const [dnsModeUpdateKey, setDnsModeUpdateKey] = useState(-1)
    const handleDnsModeUpdate = (key: number) => {
        setAction('update')
        setDnsModeUpdateKey(key)
        setRow({...DEFAULT_DNS_MODE_ROW, ...(dnsModeList[key] || {})})
    }

    const handleUpdateSubmit = async (row: DnsModeRow) => {
        let item: DnsModeRow = {...DEFAULT_DNS_MODE_ROW, ...row}
        item.hash = ''
        item.hash = await hashJson(item)
        dnsModeList[dnsModeUpdateKey] = item
        const ok = await saveDnsModeList(dnsModeList)
        if (!ok) {
            showAlertDialog('编辑保存失败')
            return
        }
        setDnsModeList([...dnsModeList])
        handleBack()
    }

    // ============================== view config ==============================
    const [dnsModeViewJson, setDnsModeViewJson] = useState('')
    const handleDnsModeViewConf = (key: number) => {
        setAction('viewConf')

        const row = dnsModeList[key]
        if (!row) return

        const dns = dnsModeToConf(row)
        setDnsModeViewJson(JSON.stringify(dns, null, 2))
    }

    // ============================== delete ==============================
    const handleDnsModeDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 "${name}" 吗？`, async () => {
            if (dnsConfig.mode === key) {
                showAlertDialog('不允许删除正在使用的模式')
                return
            }

            if (dnsModeList.length <= 1) {
                showAlertDialog('不允许删除所有模式，至少保留一个')
                return
            }

            const newList = dnsModeList.filter((_, index) => index !== key) || []
            const ok = await saveDnsModeList(newList)
            if (!ok) {
                showAlertDialog('删除失败')
            } else {
                setDnsModeList([...newList])
                setDnsModeChecked([])
            }
        })
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleDnsModeCopy = async (content: string) => {
        const ok = await clipboardWriteText(content)
        if (!ok) return
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    // ============================== close dialog ==============================
    const handleClose = (_?: any, reason?: string) => {
        if (reason === 'backdropClick') return
        handleBack()
    }

    const widthSx = {p: 2, minWidth: 580}

    const {AlertDialogComponent, showAlertDialog} = useAlertDialog()
    const {DialogComponent, dialogConfirm} = useDialog()
    return (<Stack spacing={2}>
        <AlertDialogComponent/>
        <DialogComponent/>
        <BottomNavigation
            sx={{mb: 2}} elevation={5} component={Paper} showLabels
            value={dnsNav}
            onChange={(_, v) => setDnsNav(v)}>
            <BottomNavigationAction label="DNS 设置" icon={<SettingsIcon/>}/>
            <BottomNavigationAction label="模式管理" icon={<TuneIcon/>}/>
            <BottomNavigationAction label="常见 DNS" icon={<ListIcon/>}/>
        </BottomNavigation>
        {dnsNav === 0 ? <>
            <div className="flex-between">
                <Typography variant="body1" sx={{pl: 1}}>启用内置 DNS</Typography>
                <Switch checked={dnsConfig.enable} onChange={(_, checked) => handleDnsEnabled(checked)}/>
            </div>
            {dnsModeList.length > 0 && (
                <TextField
                    select fullWidth size="small"
                    label="采用模式"
                    value={dnsConfig.mode}
                    onChange={handleDnsModeChange}>
                    {dnsModeList.map((item, index) => (
                        <MenuItem key={index} value={index}>{item.name}</MenuItem>
                    ))}
                </TextField>
            )}
            <Stack spacing={.5}>
                <Alert severity="info">
                    DNS（Domain Name System，域名系统）是互联网的核心基础设施之一，其主要功能是将人类可读的域名（如 www.google.com）转换为计算机可识别的 IP 地址（如 142.250.190.14）
                </Alert>
                <Alert severity="warning">
                    网络传输的底层依赖于 IP 地址，而域名则是 IP 地址的“别名”，这一设计旨在方便人类记忆和使用
                </Alert>
                <Alert severity="success">
                    正确设置 DNS 可以提升访问速度、增强安全性、绕过地域限制、提高稳定性，优化网络体验
                </Alert>
                <Alert severity="error">
                    错误设置 DNS 可能导致访问失败、隐私泄露、安全性降低、网络延迟增加和功能受限，影响网络体验
                </Alert>
            </Stack>
        </> : dnsNav === 1 ? <>
            <Dialog open={action !== ''} onClose={handleClose}>
                {action === 'create' ? (
                    <Stack spacing={2} sx={widthSx}>
                        <Stack spacing={2} component={Card} elevation={5} sx={{p: 1}}>
                            <TextField fullWidth size="small" label="模式名称"
                                       error={nameError} helperText={nameError ? "模式名称不能为空" : ""}
                                       value={row.name} onChange={handleRowChange('name')}/>
                            <TextField fullWidth size="small" label="模式描述" value={row.note} multiline minRows={2} maxRows={6} onChange={handleRowChange('note')}/>
                        </Stack>
                        <div className="flex-between">
                            <Button variant="contained" color="info" onClick={handleCreateSubmit}>添加</Button>
                            <Button variant="contained" onClick={handleBack}>取消</Button>
                        </div>
                    </Stack>
                ) : action === 'update' ? (
                    <DnsModeEditor dnsModeRow={row} handleUpdateSubmit={handleUpdateSubmit} handleBack={handleBack}/>
                ) : action === 'import' ? (
                    <Stack spacing={2} sx={widthSx}>
                        <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                            <TextField
                                size="small" multiline rows={10}
                                label="导入内容（URI）"
                                placeholder="每行一条，例如：doayPublicDns://xxxxxx"
                                error={errorImportData} helperText={errorImportData ? '导入内容不能为空' : ''}
                                value={dnsModeImportData}
                                onChange={handleDnsModeImportDataChange}
                            />
                        </Stack>
                        <div className="flex-between">
                            <Button variant="contained" color="info" onClick={handleDnsModeImportSubmit}>确定</Button>
                            <Button variant="contained" onClick={handleBack}>取消</Button>
                        </div>
                    </Stack>
                ) : action === 'export' ? (
                    <Stack spacing={2} sx={widthSx}>
                        <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                            <TextField size="small" multiline disabled minRows={10} maxRows={16} label="导出内容（URI）" value={dnsModeExportData}/>
                        </Stack>
                        <div className="flex-between">
                            <div>
                                <Button variant="contained" color="info" startIcon={<ContentCopyIcon/>} onClick={() => handleDnsModeCopy(dnsModeExportData)}>复制</Button>
                                {isCopied && <Chip label="复制成功" color="success" size="small" sx={{ml: 2}}/>}
                            </div>
                            <Button variant="contained" onClick={handleBack}>取消</Button>
                        </div>
                    </Stack>
                ) : action === 'viewConf' && (
                    <Stack spacing={2} sx={widthSx}>
                        <Card elevation={4}>
                            <Paper elevation={2} sx={{py: 0.5, px: 1.5, mb: '1px', borderRadius: '8px 8px 0 0'}}>
                                <Typography variant="body1">DNS 配置</Typography>
                            </Paper>
                            <JsonCodeViewer value={dnsModeViewJson} height={`calc(100vh - 350px)`}/>
                        </Card>

                        <div className="flex-between">
                            <div>
                                <Button variant="contained" color="info" startIcon={<ContentCopyIcon/>} onClick={() => handleDnsModeCopy(dnsModeViewJson)}>复制</Button>
                                {isCopied && <Chip label="复制成功" color="success" size="small" sx={{ml: 2}}/>}
                            </div>
                            <Button variant="contained" onClick={handleBack}>取消</Button>
                        </div>
                    </Stack>
                )}
            </Dialog>

            <Stack direction="row" spacing={1}>
                <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleCreate}>添加</Button>
                <Button variant="contained" color="success" startIcon={<FileUploadIcon/>} onClick={handleImport}>导入</Button>
                {dnsModeChecked.length > 0 && <Button variant="contained" color="warning" startIcon={<FileDownloadIcon/>} onClick={handleExport}>导出</Button>}
            </Stack>
            <Stack spacing={1}>
                {loading ? (
                    <LoadingCard height="160px" elevation={5}/>
                ) : dnsModeList.length === 0 ? (
                    <ErrorCard errorMsg="暂无内容" height="160px" elevation={5}/>
                ) : (
                    <TableContainer component={Card} elevation={5}>
                        <Table>
                            <TableBody>
                                {dnsModeList.map((row, key) => (
                                    <TableRow key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                        <TableCell padding="checkbox">
                                            <Checkbox value={key} checked={dnsModeChecked.includes(key)} onChange={handleDnsModeCheckedChange}/>
                                        </TableCell>
                                        <TableCell component="th" scope="row" sx={{p: 1}}>
                                            <Typography gutterBottom variant="h6" component="div">{row.name}</Typography>
                                            <Typography variant="body2" sx={{color: 'text.secondary'}}>{row.note}</Typography>
                                        </TableCell>
                                        <TableCell align="right" width="140" sx={{p: 0}}>
                                            <Tooltip arrow title="设置" placement="top">
                                                <IconButton color="primary" onClick={() => handleDnsModeUpdate(key)}><SettingsSuggestIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="查看配置" placement="top">
                                                <IconButton color="info" onClick={() => handleDnsModeViewConf(key)}><VisibilityIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="删除" placement="top">
                                                <IconButton color="error" onClick={() => handleDnsModeDelete(key, row.name)}><DeleteIcon/></IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Stack>
        </> : dnsNav === 2 && <DnsTable/>}
    </Stack>)
}
