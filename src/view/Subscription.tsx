import React, { useState, useEffect } from 'react'

import {
    Button, Chip, Checkbox, Card, Dialog, Stack, Switch, Typography, TextField,
    TableContainer, Table, TableBody, TableRow, TableCell, IconButton, Tooltip
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpIcon from '@mui/icons-material/Help'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import VpnLockIcon from '@mui/icons-material/VpnLock'
import HtmlIcon from '@mui/icons-material/Html'

import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { useAlertDialog } from "../component/useAlertDialog.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { readSubscriptionList, saveSubscriptionList } from "../util/invoke.ts"
import { formatUrl, isValidUrl } from "../util/util.ts"
import { getSubscription } from "../util/subscription.ts"
import { decodeBase64, encodeBase64, hashJson, safeJsonParse } from "../util/crypto.ts"
import { clipboardWriteText } from "../util/tauri.ts"
import { useDebounce } from "../hook/useDebounce.ts"

const DEFAULT_SUBSCRIPTION_ROW: SubscriptionRow = {
    name: '',
    note: '',
    hash: '',
    url: '',
    // updateCount: 0,
    // lastUpdate: 0,
    autoUpdate: true,
    isProxy: false,
    isHtml: false
}

const Subscription: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(2), [setNavState])

    const [loading, setLoading] = useState(true)
    const [subscriptionList, setSubscriptionList] = useState<SubscriptionList>([])
    const [subscriptionChecked, setSubscriptionChecked] = useState<number[]>([])
    const loadList = useDebounce(async () => {
        const tableList = await readSubscriptionList() as SubscriptionList
        if (tableList) setSubscriptionList(tableList)
        setLoading(false)
    }, 100)
    useEffect(loadList, [])

    const [action, setAction] = useState('')
    const [row, setRow] = useState<SubscriptionRow>(DEFAULT_SUBSCRIPTION_ROW)
    const [nameError, setNameError] = useState(false)
    const [urlError, setUrlError] = useState(false)
    const [updateKey, setUpdateKey] = useState(-1)

    const handleBack = () => {
        setAction('')
        setUpdateKey(-1)
        setErrorImportData(false)
        setSubImportData('')
        setSubExportData('')
        setSubscriptionChecked([])
    }

    const handleRowChange = (type: keyof SubscriptionRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRow(prev => {
            const value = e.target.value
            type === 'name' && setNameError(value === '')
            type === 'url' && setUrlError(value === '' || !isValidUrl(value))
            return {...prev, [type]: value}
        })
    }

    const handleRowSwitchChange = (type: string, value: boolean) => {
        setRow({...row, [type]: value})
    }

    // ============================== create & update ==============================
    const handleCreate = () => {
        setAction('create')
        setRow(DEFAULT_SUBSCRIPTION_ROW)
    }

    const handleUpdate = (key: number) => {
        setAction('update')
        setUpdateKey(key)
        setRow(subscriptionList[key] || DEFAULT_SUBSCRIPTION_ROW)
    }

    const handleSubmit = async () => {
        let item: SubscriptionRow = {...row}

        item.name = item.name.trim()
        item.note = item.note.trim()
        item.url = formatUrl(item.url.trim())

        const nameErr = item.name === ''
        const urlErr = item.url === '' || !isValidUrl(item.url)
        setNameError(nameErr)
        setUrlError(urlErr)
        if (nameErr || urlErr) return

        item.hash = ''
        item.hash = await hashJson(item)

        updateKey === -1 ? subscriptionList.push(item) : subscriptionList[updateKey] = item
        const ok = await saveSubscriptionList(subscriptionList)
        if (!ok) {
            showAlertDialog('保存失败')
            return
        }
        setSubscriptionList([...subscriptionList])
        handleBack()
    }

    // ============================== import ==============================
    const handleImport = () => {
        setAction('import')
    }

    const [errorImportData, setErrorImportData] = useState(false)
    const [subImportData, setSubImportData] = useState('')
    const handleSubImportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        setSubImportData(value)
        setErrorImportData(value === '')
    }

    const handleSubImportSubmit = async () => {
        let s = subImportData.trim()
        setErrorImportData(!s)
        if (!s) return

        const newSubList = [...subscriptionList]
        let okNum = 0
        let existNum = 0
        let errNum = 0
        let errMsg = ''
        const arr = s.split('\n')
        for (let v of arr) {
            v = v.trim()
            if (v.length === 0) continue

            if (v.startsWith('doaySub://')) {
                const base64 = v.substring(10).replace(/#.*$/, '')
                const decoded = decodeBase64(base64)
                const data = safeJsonParse(decoded)
                if (data && typeof data === 'object' && 'hash' in data) {
                    if (newSubList.some(item => item.hash === data.hash)) {
                        existNum++
                    } else {
                        newSubList.push(data)
                        okNum++
                    }
                } else {
                    errNum++
                    errMsg = '解析失败，或数据不正确'
                }
            } else {
                errNum++
                errMsg = '格式不正确，前缀非 doaySub:// 开头'
            }
        }

        if (okNum > 0) {
            const ok = await saveSubscriptionList(newSubList)
            if (!ok) {
                showAlertDialog('导入保存失败')
                return
            }
            setSubscriptionList(newSubList)
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
    const [subExportData, setSubExportData] = useState('')
    const handleExport = () => {
        setAction('export')

        let arr = []
        for (let k = 0; k < subscriptionChecked.length; k++) {
            const v = subscriptionList[k]
            if (!v) continue
            const encoded = 'doaySub://' + encodeBase64(JSON.stringify(v)) + '#' + v.name
            arr.push(encoded)
        }
        setSubExportData(arr.join('\n'))
    }

    // ============================== delete ==============================
    const handleCheckedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSubscriptionChecked(prev => {
            const value = Number(e.target.value)
            return e.target.checked ? [...prev, value] : prev.filter(item => item !== value)
        })
    }

    const handleDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 "${name}" 吗？`, async () => {
            const newList = subscriptionList.filter((_, index) => index !== key) || []
            const ok = await saveSubscriptionList(newList)
            if (!ok) {
                showAlertDialog('删除失败')
            } else {
                setSubscriptionList([...newList])
                handleBack()
            }
        })
    }

    const handleBatchDelete = () => {
        if (subscriptionChecked.length < 1) return

        dialogConfirm('确认删除', `确定要删除这 ${subscriptionChecked.length} 个订阅吗？`, async () => {
            const newList = subscriptionList.filter((_, index) => !subscriptionChecked.includes(index)) || []
            const ok = await saveSubscriptionList(newList)
            if (!ok) {
                showAlertDialog('删除失败', 'error')
            } else {
                setSubscriptionList([...newList])
                handleBack()
            }
        })
    }

    // ============================== update subscription ==============================
    const handleBatchUpdateSub = async () => {
        if (subscriptionChecked.length < 1) return

        const newList = subscriptionList.filter((_, index) => subscriptionChecked.includes(index)) || []
        handleBack()
        showAlertDialog('更新订阅任务提交成功，执行结果请查看日志', 'success')
        for (const row of newList) {
            await getSubscription(row)
        }
    }

    // ============================== sort ==============================
    const [subSortKey, setSubSortKey] = useState(-1)
    const handleSubSortStart = (e: React.MouseEvent, key: number) => {
        e.stopPropagation()
        if (subSortKey === -1) {
            setSubSortKey(key)
        } else if (subSortKey === key) {
            setSubSortKey(-1)
        } else {
            handleSubSortEnd(key).catch(_ => 0)
        }
    }

    const handleSubSortEnd = async (key: number) => {
        if (subSortKey === -1) return
        if (subSortKey === key) {
            setSubSortKey(-1)
            return
        }

        let newList = [...subscriptionList]
        let [temp] = newList.splice(subSortKey, 1)
        newList.splice(key, 0, temp)
        setSubSortKey(-1)

        const ok = await saveSubscriptionList(newList)
        if (!ok) {
            showAlertDialog('保存排序失败', 'error')
        } else {
            setSubscriptionList(newList)
        }
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleSubCopy = async (content: string) => {
        const ok = await clipboardWriteText(content)
        if (!ok) return
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const height = 'calc(100vh - 70px)'

    const {AlertDialogComponent, showAlertDialog} = useAlertDialog()
    const {DialogComponent, dialogConfirm} = useDialog()
    return <>
        <AlertDialogComponent/>
        <DialogComponent/>
        <Dialog open={action !== ''} onClose={handleBack}>
            <Stack spacing={2} sx={{p: 2, minWidth: 580}}>
                {action === 'create' || action === 'update' ? (<>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField fullWidth size="small" label="订阅名称"
                                   error={nameError} helperText={nameError ? "订阅名称不能为空" : ""}
                                   value={row.name} onChange={handleRowChange('name')}/>
                        <TextField fullWidth size="small" label="订阅描述" value={row.note} multiline minRows={2} maxRows={6} onChange={handleRowChange('note')}/>
                        <TextField fullWidth size="small" label="订阅 URL"
                                   placeholder="请输入URL，如: https://abc.com/sub.json"
                                   error={urlError} helperText={urlError ? "请填写正确的 URL" : ""}
                                   value={row.url} onChange={handleRowChange('url')}/>
                        <Stack spacing={0.5}>
                            <div className="flex-between">
                                <div className="flex-center-gap1">
                                    <Typography variant="body1" sx={{pl: 1}}>自动更新</Typography>
                                    <Tooltip arrow title="开启后，程序会自动更新订阅服务器" placement="right">
                                        <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                    </Tooltip>
                                </div>
                                <Switch checked={row.autoUpdate} onChange={(_, value) => handleRowSwitchChange('autoUpdate', value)}/>
                            </div>
                            <div className="flex-between">
                                <div className="flex-center-gap1">
                                    <Typography variant="body1" sx={{pl: 1}}>代理更新</Typography>
                                    <Tooltip arrow title="开启后，程序使用启用的代理服务器更新订阅" placement="right">
                                        <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                    </Tooltip>
                                </div>
                                <Switch checked={row.isProxy} onChange={(_, value) => handleRowSwitchChange('isProxy', value)}/>
                            </div>
                            <div className="flex-between">
                                <div className="flex-center-gap1">
                                    <Typography variant="body1" sx={{pl: 1}}>HTML 页面</Typography>
                                    <Tooltip arrow title="开启后，将自动获取页面中的分享链接" placement="right">
                                        <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                    </Tooltip>
                                </div>
                                <Switch checked={row.isHtml} onChange={(_, value) => handleRowSwitchChange('isHtml', value)}/>
                            </div>
                        </Stack>
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleSubmit}>{action === 'create' ? '添加' : '修改'}</Button>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </>) : action === 'import' ? (<>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField
                            size="small" multiline rows={10}
                            label="导入内容（URI）"
                            placeholder="每行一条，例如：doaySub://xxxxxx"
                            error={errorImportData} helperText={errorImportData ? '导入内容不能为空' : ''}
                            value={subImportData}
                            onChange={handleSubImportDataChange}
                        />
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleSubImportSubmit}>确定</Button>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </>) : action === 'export' && (<>
                    <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                        <TextField size="small" multiline disabled minRows={10} maxRows={16} label="导出内容（URI）" value={subExportData}/>
                    </Stack>
                    <div className="flex-between">
                        <div>
                            <Button variant="contained" color="info" startIcon={<ContentCopyIcon/>} onClick={() => handleSubCopy(subExportData)}>复制</Button>
                            {isCopied && <Chip label="复制成功" color="success" size="small" sx={{ml: 2}}/>}
                        </div>
                        <Button variant="contained" onClick={handleBack}>取消</Button>
                    </div>
                </>)}
            </Stack>
        </Dialog>

        <Stack direction="row" spacing={1} sx={{mb: 1}}>
            <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleCreate}>添加</Button>
            <Button variant="contained" color="success" startIcon={<FileUploadIcon/>} onClick={handleImport}>导入</Button>
            {subscriptionChecked.length > 0 && (<>
                <Button variant="contained" color="warning" startIcon={<FileDownloadIcon/>} onClick={handleExport}>导出</Button>
                <Button variant="contained" color="error" onClick={handleBatchDelete}>批量删除</Button>
                <Button variant="contained" color="warning" onClick={handleBatchUpdateSub}>更新订阅</Button>
            </>)}
        </Stack>
        <Stack spacing={1}>
            {loading ? (
                <LoadingCard height={height}/>
            ) : subscriptionList.length === 0 ? (
                <ErrorCard errorMsg="暂无订阅" height={height}/>
            ) : (
                <TableContainer component={Card}>
                    <Table>
                        <TableBody>
                            {subscriptionList.map((row, key) => (
                                <TableRow
                                    key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                    className={subSortKey > -1 ? (subSortKey === key ? 'sort-current' : 'sort-target') : ''}
                                    onClick={() => handleSubSortEnd(key)}
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox value={key} checked={subscriptionChecked.includes(key)} onChange={handleCheckedChange}/>
                                    </TableCell>
                                    <TableCell component="th" scope="row" sx={{p: 1}}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <div>
                                                <Typography variant="body1">{row.name}</Typography>
                                                <Typography variant="body2" color="textSecondary">{row.note}</Typography>
                                                <Typography variant="body2" color="warning" className="text-ellipsis">{row.url}</Typography>
                                            </div>
                                            <div>
                                                {row.autoUpdate && (
                                                    <Tooltip arrow title="已开启自动更新" placement="top"><IconButton color="success"><AutorenewIcon/></IconButton></Tooltip>
                                                )}
                                                {row.isProxy && (
                                                    <Tooltip arrow title="使用代理更新" placement="top"><IconButton color="warning"><VpnLockIcon/></IconButton></Tooltip>
                                                )}
                                                {row.isHtml && (
                                                    <Tooltip arrow title="HTML 页面" placement="top"><IconButton color="primary"><HtmlIcon/></IconButton></Tooltip>
                                                )}
                                            </div>
                                        </Stack>
                                    </TableCell>
                                    <TableCell align="right" sx={{p: 1}}>
                                        <Stack direction="row" justifyContent="right" alignItems="center">
                                            <Tooltip arrow title="排序" placement="top">
                                                <IconButton color="info" onClick={e => handleSubSortStart(e, key)}><OpenWithIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="设置" placement="top">
                                                <IconButton color="primary" onClick={() => handleUpdate(key)}><SettingsSuggestIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="删除" placement="top">
                                                <IconButton color="error" onClick={() => handleDelete(key, row.name)}><DeleteIcon/></IconButton>
                                            </Tooltip>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Stack>
    </>
}

export default Subscription
