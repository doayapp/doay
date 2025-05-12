import { useEffect, useState } from 'react'
import {
    Button, Card, Chip, Checkbox,
    FormControl, FormControlLabel, FormGroup, FormLabel,
    IconButton, MenuItem, Radio, RadioGroup, Stack,
    Table, TableBody, TableCell, TableContainer, TableRow, TextField, Typography, Tooltip,
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import AddIcon from '@mui/icons-material/Add'
import EditSquareIcon from '@mui/icons-material/EditSquare'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import DeleteIcon from '@mui/icons-material/Delete'
import HelpIcon from '@mui/icons-material/Help'

import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { useAlertDialog } from '../component/useAlertDialog.tsx'
import { useDialog } from "../component/useDialog.tsx"
import { saveRuleModeList } from "../util/invoke.ts"
import { processDomain, processIP, processPort } from "../util/util.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { hashJson } from "../util/crypto.ts"
import { DEFAULT_RULE_ROW } from "../util/config.ts"
import { openUrl } from "../util/tauri.ts"

const outboundTagList: Record<string, string> = {
    proxy: '代理访问',
    direct: '直接访问',
    reject: '阻止访问'
}

const oTagColors: Record<string, string> = {
    proxy: 'warning',
    direct: 'success',
    reject: 'error'
}

const ruleTypeList: Record<string, string> = {
    domain: '域名',
    ip: 'IP 地址',
    multi: '多维规则',
}

export const RuleModeEditor = ({ruleModeList, setRuleModeList, ruleModeKey, setRuleModeKey}: {
    ruleModeList: RuleModeList,
    setRuleModeList: React.Dispatch<React.SetStateAction<RuleModeList>>
    ruleModeKey: number,
    setRuleModeKey: (ruleModeKey: number) => void
}) => {
    const [loading, setLoading] = useState(true)
    const [ruleModeRow, setRuleModeRow] = useState<RuleModeRow>({
        name: '',
        note: '',
        domainStrategy: 'AsIs',
        hash: '',
        rules: []
    })

    useEffect(() => {
        const item = ruleModeList[ruleModeKey]
        if (item) setRuleModeRow(item)
        setLoading(false)
    }, [])

    const saveRuleModeRow = useDebounce(async (newRuleMode: RuleModeRow) => {
        ruleModeList[ruleModeKey] = newRuleMode
        const ok = await saveRuleModeList(ruleModeList)
        if (!ok) {
            showAlertDialog('保存失败')
            return
        }
    }, 600)

    const handleRuleModeRowChange = (type: keyof RuleModeRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleModeRow(prev => {
            const newRuleMode = {...prev, [type]: e.target.value}
            saveRuleModeRow(newRuleMode)
            return newRuleMode
        })
    }

    const handleRuleBack = () => {
        setAction('')
        setRuleUpdateKey(-1)
    }

    // ====================================== create ======================================
    const [action, setAction] = useState('')
    const [ruleRow, setRuleRow] = useState<RuleRow>(DEFAULT_RULE_ROW)
    const handleRuleCreate = () => {
        setAction('create')
        setRuleRow(DEFAULT_RULE_ROW)
    }

    // ====================================== update ======================================
    const [ruleUpdateKey, setRuleUpdateKey] = useState(-1)
    const handleRuleUpdate = (key: number) => {
        setAction('update')
        setRuleUpdateKey(key)
        const item = ruleModeList[ruleModeKey].rules[key]
        if (item) setRuleRow({...DEFAULT_RULE_ROW, ...item})
    }

    // ====================================== change ======================================
    const [nameError, setNameError] = useState(false)
    const handleRuleChange = (type: keyof RuleRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleRow(prev => {
            const value = e.target.value
            type === 'name' && setNameError(value === '')
            return {...prev, [type]: value}
        })
    }

    const handleProtocolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleRow(prev => {
            if (!prev) return prev

            const value = e.target.value
            const protocols = prev.protocol.split(',').filter(p => p.trim() !== '')
            const index = protocols.indexOf(value)
            if (index === -1) {
                protocols.push(value)
            } else {
                protocols.splice(index, 1)
            }

            return {
                ...prev,
                protocol: protocols.join(','),
            }
        })
    }

    // ====================================== submit ======================================
    const [domainError, setDomainError] = useState(false)
    const [ipError, setIpError] = useState(false)
    const handleSubmit = async () => {
        let item: RuleRow = {...ruleRow}

        item.name = item.name.trim()
        item.note = item.note.trim()
        if (item.name === '') {
            setNameError(true)
            return
        }
        setNameError(false)

        // 域名规则
        if (item.domain) item.domain = processDomain(item.domain)
        if (item.ruleType === 'domain') {
            if (item.domain === '') {
                setDomainError(true)
                return
            }
            setDomainError(false)
            item.ip = ''
        }

        // IP 规则
        if (item.ip) item.ip = processIP(item.ip)
        if (item.ruleType === 'ip') {
            if (item.ip === '') {
                setIpError(true)
                return
            }
            setIpError(false)
            item.domain = ''
        }

        // 清空可能存在的多余数据
        if (item.ruleType !== 'multi') {
            item.port = ''
            item.sourcePort = ''
            item.network = ''
            item.protocol = ''
        }

        if (item.ruleType === 'multi') {
            item.port = processPort(item.port)
            item.sourcePort = processPort(item.sourcePort)
            if (!item.domain && !item.port && !item.sourcePort && !item.network && !item.protocol) {
                showAlertDialog('请至少填写一项内容', 'warning')
                return
            }
        }

        const rules = [...ruleModeList[ruleModeKey].rules]
        if (ruleUpdateKey > -1) {
            rules[ruleUpdateKey] = item
        } else {
            rules.push(item)
        }

        const ok = await updateHashAndRule(rules)
        if (!ok) {
            showAlertDialog('保存失败')
            return
        }
        setRuleModeList(ruleModeList)
        handleRuleBack()
    }

    const updateHashAndRule = async (rules: RuleRow[]) => {
        ruleModeList[ruleModeKey].rules = rules.map(item => ({...DEFAULT_RULE_ROW, ...item}))
        ruleModeList[ruleModeKey].hash = await hashJson(rules)
        const ok = await saveRuleModeList(ruleModeList)
        if (ok) setRuleModeList([...ruleModeList])
        return ok
    }

    // ====================================== delete ======================================
    const handleRuleDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 “${name}” 这条规则吗？`, async () => {
            const rules = ruleModeList[ruleModeKey].rules?.filter((_, index) => index !== key) || []
            const ok = await updateHashAndRule(rules)
            if (!ok) showAlertDialog('删除失败')
        })
    }

    const handleBack = () => {
        setRuleModeKey(-1)
        setRuleModeList(prev => {
            prev[ruleModeKey] = ruleModeRow
            return prev
        })
    }

    // ====================================== sort ======================================
    // 在 MacOS 上测试，tauri 内置浏览器支持原生 HTML 5 拖拽事件非常差，测试结果，仅支持 onDragStart onDragEnd
    // 本想通过 onDragStart onDragEnd 结合传统判断坐标位置实现拖拽排序，但是测试发现，clientX 和 clientY 参数在不同浏览器环境表现不一致，最终放弃使用 HTML 5 原生拖拽实现排序功能
    // 又不想通过 mouse move 事件来实现。主要实现后，要么难用，要么复杂，所以设计一个《点击排序的功能》来简化排序
    const [sortKey, setSortKey] = useState<number>(-1)
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

        let rules = [...ruleModeRow.rules]
        let [temp] = rules.splice(sortKey, 1)
        rules.splice(key, 0, temp)
        setSortKey(-1)

        const ok = await updateHashAndRule(rules)
        if (!ok) showAlertDialog('保存排序失败', 'error')
    }

    const {AlertDialogComponent, showAlertDialog} = useAlertDialog()
    const {DialogComponent, dialogConfirm} = useDialog()
    return (<>
        <AlertDialogComponent/>
        <DialogComponent/>
        <Stack direction="row" spacing={1}>
            <Button variant="contained" startIcon={<ChevronLeftIcon/>} onClick={handleBack}>返回</Button>
        </Stack>

        <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
            <TextField size="small" label="模式名称" value={ruleModeRow.name} onChange={handleRuleModeRowChange('name')}/>
            <TextField size="small" label="模式描述" value={ruleModeRow.note} onChange={handleRuleModeRowChange('note')} multiline rows={2}/>
            <TextField
                select fullWidth size="small"
                label="域名解析策略"
                value={ruleModeRow.domainStrategy || 'AsIs'}
                onChange={handleRuleModeRowChange('domainStrategy')}>
                <MenuItem value="AsIs">仅域名匹配，不解析为IP匹配</MenuItem>
                <MenuItem value="IPIfNonMatch">优先域名匹配，未匹配上则解析为IP再次匹配</MenuItem>
                <MenuItem value="IPOnDemand">优先解析为IP匹配</MenuItem>
            </TextField>
        </Stack>

        {action ? (<>
            <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                <TextField fullWidth size="small" label="规则名称"
                           error={nameError} helperText={nameError ? "规则名称不能为空" : ""}
                           value={ruleRow.name} onChange={handleRuleChange('name')}/>
                <TextField fullWidth size="small" label="规则描述" value={ruleRow.note} multiline rows={2} onChange={handleRuleChange('note')}/>
                <TextField fullWidth size="small" label="访问方式" value={ruleRow.outboundTag} select onChange={handleRuleChange('outboundTag')}>
                    {Object.entries(outboundTagList).map(([key, value]) => (
                        <MenuItem key={key} value={key}>{value}</MenuItem>
                    ))}
                </TextField>
                <TextField fullWidth size="small" label="规则类型" value={ruleRow.ruleType} select onChange={handleRuleChange('ruleType')}>
                    {Object.entries(ruleTypeList).map(([key, value]) => (
                        <MenuItem key={key} value={key}>{value}</MenuItem>
                    ))}
                </TextField>
                {ruleRow.ruleType === 'domain' ? (
                    <TextField fullWidth size="small" label="域名(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="如：x.com"
                               error={domainError} helperText={domainError ? "域名不能为空" : ""}
                               value={ruleRow.domain} onChange={handleRuleChange('domain')}/>
                ) : ruleRow.ruleType === 'ip' ? (
                    <TextField fullWidth size="small" label="IP 地址(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="支持 CIDR 格式 如: 10.0.0.0/8"
                               error={ipError} helperText={ipError ? "IP 地址不能为空" : ""}
                               value={ruleRow.ip} onChange={handleRuleChange('ip')}/>
                ) : ruleRow.ruleType === 'multi' && (<>
                    <TextField fullWidth size="small" label="域名(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="如：x.com"
                               value={ruleRow.domain} onChange={handleRuleChange('domain')}/>
                    <TextField fullWidth size="small" label="IP 地址(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="支持 CIDR 格式 如: 10.0.0.0/8"
                               value={ruleRow.ip} onChange={handleRuleChange('ip')}/>
                    <TextField fullWidth size="small" label="目标端口(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="支持范围端口 如: 1000-2000"
                               value={ruleRow.port} onChange={handleRuleChange('port')}/>
                    <TextField fullWidth size="small" label="来源端口(每行一条)" multiline minRows={2} maxRows={6}
                               placeholder="支持范围端口 如: 1000-2000"
                               value={ruleRow.sourcePort} onChange={handleRuleChange('sourcePort')}/>

                    <FormControl>
                        <FormLabel id="rule-network">传输协议(network)</FormLabel>
                        <RadioGroup row aria-labelledby="rule-network" value={ruleRow.network} onChange={handleRuleChange('network')}>
                            <FormControlLabel value="" control={<Radio/>} label="None"/>
                            <FormControlLabel value="tcp" control={<Radio/>} label="TCP"/>
                            <FormControlLabel value="udp" control={<Radio/>} label="UDP"/>
                            <FormControlLabel value="tcp,udp" control={<Radio/>} label="TCP, UDP"/>
                        </RadioGroup>
                    </FormControl>

                    <FormControl>
                        <FormLabel id="rule-protocol">请求协议(protocol)</FormLabel>
                        <FormGroup row aria-labelledby="rule-protocol">
                            <FormControlLabel
                                label="HTTP 1.1"
                                control={<Checkbox checked={ruleRow.protocol.includes('http')} value="http" onChange={handleProtocolChange}/>}
                            />
                            <FormControlLabel
                                label="TLS"
                                control={<Checkbox checked={ruleRow.protocol.includes('tls')} value="tls" onChange={handleProtocolChange}/>}
                            />
                            <FormControlLabel
                                label="QUIC"
                                control={<Checkbox checked={ruleRow.protocol.includes('quic')} value="quic" onChange={handleProtocolChange}/>}
                            />
                            <FormControlLabel
                                label="BitTorrent"
                                control={<Checkbox checked={ruleRow.protocol.includes('bittorrent')} value="bittorrent" onChange={handleProtocolChange}/>}
                            />
                        </FormGroup>
                    </FormControl>
                </>)}
            </Stack>

            <div className="flex-between">
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="info" onClick={handleSubmit}>确定</Button>
                    <Button variant="contained" onClick={handleRuleBack}>取消</Button>
                </Stack>
                <Tooltip placement="left" arrow title={'官方文档'}>
                    <HelpIcon
                        fontSize="small" sx={{cursor: 'pointer', color: 'text.secondary'}}
                        onClick={() => openUrl("https://xtls.github.io/config/routing.html#ruleobject")}/>
                </Tooltip>
            </div>
        </>) : (<>
            <div className="flex-between">
                <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleRuleCreate}>添加</Button>
                <Tooltip placement="left" arrow title={'热心网友整理的域名和IP数据'}>
                    <HelpIcon sx={{cursor: 'pointer'}} onClick={() => openUrl("https://github.com/Loyalsoldier/v2ray-rules-dat/releases")}/>
                </Tooltip>
            </div>
            {loading ? (
                <LoadingCard height="160px"/>
            ) : ruleModeRow.rules.length === 0 ? (
                <ErrorCard errorMsg="规则为空" height="160px"/>
            ) : (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableBody>
                            {ruleModeRow.rules.map((row, key) => (
                                <TableRow
                                    key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                    className={sortKey > -1 ? (sortKey === key ? 'sort-current' : 'sort-target') : ''}
                                    onClick={() => handleSortEnd(key)}>
                                    <TableCell sx={{p: '6px 12px', maxWidth: '500px'}} component="th" scope="row">
                                        <Typography variant="body1" component="div">{key + 1}. {row.name}</Typography>
                                        <Typography variant="body2" sx={{color: 'text.secondary'}}>{row.note}</Typography>
                                    </TableCell>
                                    <TableCell sx={{p: '4px'}} width="240" align="right">
                                        <Chip size="small" sx={{mr: 2}} label={outboundTagList[row.outboundTag]} color={oTagColors[row.outboundTag] as any}/>
                                        <Tooltip arrow title="排序" placement="top">
                                            <IconButton color="info" onClick={e => handleSortStart(e, key)}><OpenWithIcon/></IconButton>
                                        </Tooltip>
                                        <Tooltip arrow title="修改" placement="top">
                                            <IconButton color="primary" onClick={() => handleRuleUpdate(key)}><EditSquareIcon/></IconButton>
                                        </Tooltip>
                                        <Tooltip arrow title="删除" placement="top">
                                            <IconButton color="error" onClick={() => handleRuleDelete(key, row.name)}><DeleteIcon/></IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>)}
    </>)
}
