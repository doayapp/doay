import { useState, useEffect } from 'react'
import {
    Card, Checkbox, Stack, TextField, MenuItem, Button, Typography, Paper,
    TableContainer, Table, TableBody, TableRow, TableCell, IconButton, Tooltip,
    BottomNavigation, BottomNavigationAction
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow'
import ForkRightIcon from '@mui/icons-material/ForkRight'
import ModeIcon from '@mui/icons-material/Tune'
import AddIcon from '@mui/icons-material/Add'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'

import { JsonCodeViewer } from "../component/CodeViewer.tsx"
import { ErrorCard } from "../component/useCard.tsx"
import { useAlertDialog } from "../component/useAlertDialog.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { useChip } from "../component/useChip.tsx"
import { RuleModeEditor } from "./RuleModeEditor.tsx"
import { saveRuleConfig, readRuleModeList, saveRuleModeList } from "../util/invoke.ts"
import { DEFAULT_RULE_MODE_LIST } from "../util/config.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { decodeBase64, encodeBase64, hashJson, safeJsonParse } from "../util/crypto.ts"
import { ruleModeToConf } from "../util/rule.ts"
import { saveRayRule } from "../util/ray.ts"
import { updateProxyPAC } from "../util/proxy.ts"
import { clipboardWriteText } from "../util/tauri.ts"

const DEFAULT_RULE_MODE_ROW: RuleModeRow = {
    name: '',
    note: '',
    domainStrategy: '',
    hash: '',
    rules: []
}

export const RuleAdvanced = ({handleClose, ruleConfig, setRuleConfig, ruleDomain}: {
    handleClose: () => void,
    ruleConfig: RuleConfig,
    setRuleConfig: React.Dispatch<React.SetStateAction<RuleConfig>>,
    ruleDomain: RuleDomain,
}) => {
    const [tab, setTab] = useState(0)
    const [ruleModeList, setRuleModeList] = useState<RuleModeList>(DEFAULT_RULE_MODE_LIST)
    const [ruleModeKey, setRuleModeKey] = useState(-1)

    const loadData = useDebounce(async () => {
        const list = await readRuleModeList() as RuleModeList
        if (list) {
            const mergedList = (list).map(item => ({...DEFAULT_RULE_MODE_ROW, ...item}))
            setRuleModeList(mergedList)
        }
    }, 100)
    useEffect(loadData, [])

    // ============================== setting ==============================
    const handleRuleConfigChange = (name: keyof RuleConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleConfig(prev => ({...prev, [name]: e.target.value}))
    }

    const handleSubmit = async () => {
        const ok = await saveRuleConfig(ruleConfig)
        if (!ok) {
            showChip('设置失败', 'error')
            return
        }

        await updateProxyPAC(ruleConfig, ruleDomain)
        await saveRayRule(ruleConfig, ruleDomain, ruleModeList)
        showChip('设置成功', 'success')
    }

    // ============================== base ==============================
    const [action, setAction] = useState('')
    const [ruleModeImportData, setRuleModeImportData] = useState('')
    const [ruleModeExportData, setRuleModeExportData] = useState('')
    const [errorName, setErrorName] = useState(false)
    const [ruleModeChecked, setRuleModeChecked] = useState<number[]>([])
    const [ruleModeRow, setRuleModeRow] = useState<RuleModeRow>(DEFAULT_RULE_MODE_ROW)
    const handleRuleModeChange = (type: keyof RuleModeRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleModeRow(prev => {
            const value = e.target.value
            if (type === 'name') setErrorName(value === '')
            return {...prev, [type]: value}
        })
    }

    const handleRuleModeCheckedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleModeChecked(prev => {
            const value = Number(e.target.value)
            if (e.target.checked) {
                return [...prev, value]
            } else {
                return prev.filter(item => item !== value)
            }
        })
    }

    const handleRuleModeCancel = () => {
        setAction('')
        setRuleModeConf('')
        setRuleModeImportData('')
        setRuleModeExportData('')
        setRuleModeChecked([])
        setErrorImportData(false)
    }

    // ============================== create & update ==============================
    const handleRuleModeCreate = () => {
        setAction('create')
        setRuleModeRow(DEFAULT_RULE_MODE_ROW)
    }

    const handleRuleModeUpdate = (key: number) => {
        setRuleModeKey(key)
    }

    const handleRuleModeSubmit = useDebounce(async () => {
        const newRuleModeRow = {...ruleModeRow}
        newRuleModeRow.name = newRuleModeRow.name.trim()
        if (newRuleModeRow.name === '') {
            setErrorName(true)
            return
        }
        setErrorName(false)

        newRuleModeRow.note = newRuleModeRow.note.trim()
        newRuleModeRow.hash = await hashJson(newRuleModeRow.rules)

        const newRuleModeList = [...ruleModeList]
        newRuleModeList.push(newRuleModeRow)
        const ok = await saveRuleModeList(newRuleModeList)
        if (!ok) {
            showAlertDialog('添加失败')
            return
        }
        setRuleModeList(newRuleModeList)
        setAction('')
    }, 50)

    // ============================== import ==============================
    const handleRuleModeImport = () => {
        setAction('import')
    }

    const [errorImportData, setErrorImportData] = useState(false)
    const handleRuleModeImportDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        setRuleModeImportData(value)
        setErrorImportData(value === '')
    }

    const handleRuleModeImportSubmit = async () => {
        let s = ruleModeImportData.trim()
        setErrorImportData(!s)
        if (!s) return

        const newRuleModeList = [...ruleModeList]
        let okNum = 0
        let existNum = 0
        let errNum = 0
        let errMsg = ''
        const arr = s.split('\n')
        for (let v of arr) {
            v = v.trim()
            if (v.length === 0) continue

            if (v.startsWith('doayRule://')) {
                const base64 = v.substring(11).replace(/#.*$/, '')
                const decoded = decodeBase64(base64)
                const data = safeJsonParse(decoded)
                if (data && typeof data === 'object' && 'hash' in data) {
                    if (newRuleModeList.some(item => item.hash === data.hash)) {
                        existNum++
                    } else {
                        newRuleModeList.push(data)
                        okNum++
                    }
                } else {
                    errNum++
                    errMsg = '解析失败，或数据不正确'
                }
            } else {
                errNum++
                errMsg = '格式不正确，前缀非 doayRule:// 开头'
            }
        }

        if (okNum > 0) {
            const ok = await saveRuleModeList(newRuleModeList)
            if (!ok) {
                showAlertDialog('导入保存失败')
                return
            }
            setRuleModeList(newRuleModeList)
            handleRuleModeCancel()

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
    const handleRuleModeExport = () => {
        setAction('export')

        let arr = []
        for (let i = 0; i < ruleModeChecked.length; i++) {
            const ruleMode = ruleModeList[i]
            if (ruleMode) {
                const encoded = 'doayRule://' + encodeBase64(JSON.stringify(ruleMode)) + '#' + ruleMode.name
                arr.push(encoded)
            }
        }
        setRuleModeExportData(arr.join('\n'))
    }

    // ============================== viewConf ==============================
    const [ruleModeConf, setRuleModeConf] = useState('')
    const handleRuleModeViewConf = (key: number) => {
        setAction('viewConf')
        const ruleMode = ruleModeList[key]
        if (ruleMode && Array.isArray(ruleMode.rules) && ruleMode.rules.length > 0) {
            const rules = ruleModeToConf(ruleMode.rules)
            setRuleModeConf(JSON.stringify(rules, null, 2))
        } else {
            setRuleModeConf('')
        }
    }

    // ============================== delete ==============================
    const handleRuleModeDelete = async (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 “${name}” 吗？`, async () => {
            if (ruleConfig.mode === key) {
                showAlertDialog('不允许删除正在使用的模式')
                return
            }

            if (ruleModeList.length < 2) {
                showAlertDialog('不允许删除所有模式，至少保留一个')
                return
            }

            const newRuleModeList = [...ruleModeList]
            newRuleModeList.splice(key, 1)
            const ok = await saveRuleModeList(newRuleModeList)
            if (!ok) {
                showAlertDialog('删除失败')
                return
            }
            setRuleModeList(newRuleModeList)
            setRuleModeChecked([])
        })
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleRuleModeCopy = async (content: string) => {
        const ok = await clipboardWriteText(content)
        if (!ok) return
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    const {AlertDialogComponent, showAlertDialog} = useAlertDialog()
    const {DialogComponent, dialogConfirm} = useDialog()
    const {ChipComponent, showChip} = useChip()
    return (<>
        <AlertDialogComponent/>
        <DialogComponent/>
        <Stack spacing={2} sx={{p: 2, minWidth: '700px'}}>
            <DoubleArrowIcon onClick={handleClose}/>
            <BottomNavigation
                sx={{mb: 2, mt: 1}}
                component={Card}
                showLabels value={tab}
                onChange={(_, v) => setTab(v)}>
                <BottomNavigationAction label="访问策略" icon={<ForkRightIcon/>}/>
                <BottomNavigationAction label="模式管理" icon={<ModeIcon/>}/>
            </BottomNavigation>
            {tab === 0 ? (<>
                <Stack component={Card} spacing={3} sx={{p: 1, pt: 2}}>
                    <TextField
                        select fullWidth size="small"
                        label="未匹配上的域名"
                        value={ruleConfig.unmatchedStrategy}
                        onChange={handleRuleConfigChange('unmatchedStrategy')}>
                        <MenuItem value="proxy">代理访问</MenuItem>
                        <MenuItem value="direct">直接访问</MenuItem>
                    </TextField>
                    <TextField
                        select fullWidth size="small"
                        label="采用模式"
                        value={ruleConfig.mode}
                        onChange={handleRuleConfigChange('mode')}>
                        {ruleModeList.map((item, index) => (
                            <MenuItem key={index} value={index}>{item.name}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button variant="contained" color="info" onClick={handleSubmit}>确定</Button>
                    <ChipComponent/>
                </Stack>
            </>) : tab === 1 && (<>
                {ruleModeKey > -1 ? (<>
                    <RuleModeEditor ruleModeList={ruleModeList} setRuleModeList={setRuleModeList} ruleModeKey={ruleModeKey} setRuleModeKey={setRuleModeKey}/>
                </>) : action === 'create' ? (<>
                    <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                        <TextField
                            size="small"
                            label="模式名称"
                            error={errorName} helperText={errorName ? '模式名称不能为空' : ''}
                            value={ruleModeRow.name}
                            onChange={handleRuleModeChange('name')}
                        />
                        <TextField size="small" label="模式描述" value={ruleModeRow.note} onChange={handleRuleModeChange('note')} multiline rows={2}/>
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleRuleModeSubmit}>添加</Button>
                        <Button variant="contained" onClick={handleRuleModeCancel}>取消</Button>
                    </div>
                </>) : action === 'import' ? (<>
                    <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                        <TextField
                            size="small" multiline rows={10}
                            label="导入内容（URI）"
                            placeholder="每行一条，例如：doayRule://xxxxxx"
                            error={errorImportData} helperText={errorImportData ? '导入内容不能为空' : ''}
                            value={ruleModeImportData}
                            onChange={handleRuleModeImportDataChange}
                        />
                    </Stack>
                    <div className="flex-between">
                        <Button variant="contained" color="info" onClick={handleRuleModeImportSubmit}>确定</Button>
                        <Button variant="contained" onClick={handleRuleModeCancel}>取消</Button>
                    </div>
                </>) : action === 'export' ? (<>
                    <div className="flex-between">
                        <Button variant="contained" startIcon={<ChevronLeftIcon/>} onClick={handleRuleModeCancel}>返回</Button>
                        <Tooltip arrow placement="left" title={isCopied ? '已复制' : '复制导出内容'}>
                            <IconButton size="small" onClick={() => handleRuleModeCopy(ruleModeExportData)}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </div>
                    <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                        <TextField size="small" multiline disabled minRows={10} maxRows={20} label="导出内容（URI）" value={ruleModeExportData}/>
                    </Stack>
                </>) : action === 'viewConf' ? (<>
                    <div className="flex-between">
                        <Button variant="contained" startIcon={<ChevronLeftIcon/>} onClick={handleRuleModeCancel}>返回</Button>
                    </div>
                    {ruleModeConf ? (
                        <Card elevation={4}>
                            <Paper elevation={2} sx={{py: 0.5, px: 1.5, mb: '1px', borderRadius: '8px 8px 0 0'}}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body1">规则配置</Typography>
                                    <Tooltip arrow placement="left" title={isCopied ? '已复制' : '复制规则配置'}>
                                        <IconButton size="small" onClick={() => handleRuleModeCopy(ruleModeConf)}><ContentCopyIcon fontSize="small"/></IconButton>
                                    </Tooltip>
                                </Stack>
                            </Paper>
                            <JsonCodeViewer value={ruleModeConf} height={`calc(100vh - 240px)`}/>
                        </Card>
                    ) : (
                        <ErrorCard errorMsg="没有规则" height="160px"/>
                    )}
                </>) : (<>
                    <Stack direction="row" spacing={1}>
                        <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleRuleModeCreate}>添加</Button>
                        <Button variant="contained" color="success" startIcon={<FileUploadIcon/>} onClick={handleRuleModeImport}>导入</Button>
                        {ruleModeChecked.length > 0 && (
                            <Button variant="contained" color="warning" startIcon={<FileDownloadIcon/>} onClick={handleRuleModeExport}>导出</Button>
                        )}
                    </Stack>
                    <TableContainer component={Card}>
                        <Table>
                            <TableBody>
                                {ruleModeList.map((row, key) => (
                                    <TableRow key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                        <TableCell padding="checkbox">
                                            <Checkbox value={key} checked={ruleModeChecked.includes(key)} onChange={handleRuleModeCheckedChange}/>
                                        </TableCell>
                                        <TableCell component="th" scope="row">
                                            <Typography gutterBottom variant="h6" component="div">{row.name}</Typography>
                                            <Typography variant="body2" sx={{color: 'text.secondary'}}>{row.note}</Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip arrow title="设置" placement="top">
                                                <IconButton color="primary" onClick={() => handleRuleModeUpdate(key)}><SettingsSuggestIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="查看配置" placement="top">
                                                <IconButton color="info" onClick={() => handleRuleModeViewConf(key)}><VisibilityIcon/></IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="删除" placement="top">
                                                <IconButton color="error" onClick={() => handleRuleModeDelete(key, row.name)}><DeleteIcon/></IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>)}
            </>)}
        </Stack>
    </>)
}
