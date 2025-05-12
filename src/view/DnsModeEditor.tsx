import { useState, useEffect } from 'react'
import {
    Button, Card, Stack, DialogContent, DialogActions,
    TableContainer, Table, TableRow, TableCell, TableBody, Tooltip, IconButton,
    Typography, Switch, TextField, MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditSquareIcon from '@mui/icons-material/EditSquare'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import DeleteIcon from '@mui/icons-material/Delete'

import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { SelectField } from "../component/SelectField.tsx"
import { DEFAULT_DNS_MODE_ROW } from "../util/config.ts"
import { processDomain, processIP } from "../util/util.ts"

const DEFAULT_DNS_HOST_ROW: DnsHostRow = {
    name: '',
    note: '',
    domain: '',
    host: '',
}

const DEFAULT_DNS_SERVER_ROW: DnsServerRow = {
    name: '',
    note: '',
    type: 'address',
    address: '',
    port: '',
    domains: '',
    expectIPs: '',
    clientIP: '',
    queryStrategy: 'UseIP',
    timeoutMs: 4000,
    skipFallback: false,
    allowUnexpectedIPs: false,
}

export const DnsModeEditor = ({dnsModeRow, handleUpdateSubmit, handleBack}: {
    dnsModeRow: DnsModeRow;
    handleUpdateSubmit: (row: DnsModeRow) => void;
    handleBack: () => void;
}) => {
    const [loading, setLoading] = useState(true)
    const [action, setAction] = useState('')
    const [modeRow, setModeRow] = useState<DnsModeRow>(DEFAULT_DNS_MODE_ROW)
    const [dnsNameError, setDnsNameError] = useState(false)
    useEffect(() => {
        setModeRow({...dnsModeRow})
        setLoading(false)
    }, [dnsModeRow])

    const handleRowChange = (type: keyof DnsModeRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (type === 'name') setDnsNameError(!value.trim())
        setModeRow({...modeRow, [type]: value})
    }

    const handleRowSelectChange = (type: string, value: string) => {
        setModeRow({...modeRow, [type]: value})
    }

    const handleRowSwitchChange = (type: string, value: boolean) => {
        setModeRow({...modeRow, [type]: value})
    }

    const handleSubmit = () => {
        let item: DnsModeRow = {...modeRow}

        item.name = item.name.trim()
        const isNameEmpty = item.name === ''
        setDnsNameError(isNameEmpty)
        if (isNameEmpty) return

        item.note = item.note.trim()
        item.clientIP = item.clientIP.trim()

        handleUpdateSubmit(item)
    }

    // ====================================== dnsHost ======================================
    const [dnsHostKey, setDnsHostKey] = useState(-1)
    const [dnsHostRow, setDnsHostRow] = useState<DnsHostRow>(DEFAULT_DNS_HOST_ROW)
    const [dnsHostNameError, setDnsHostNameError] = useState(false)

    const handleHostCreate = () => {
        setAction('host')
        setDnsHostRow(DEFAULT_DNS_HOST_ROW)
    }

    const handleBackToList = () => {
        setAction('')
        setDnsHostKey(-1)
        setDnsHostNameError(false)
        setDnsServerNameError(false)
    }

    const handleHostRowChange = (type: keyof DnsHostRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (type === 'name') setDnsHostNameError(!value.trim())
        setDnsHostRow({...dnsHostRow, [type]: value})
    }

    const handleHostSubmit = () => {
        const item = {...dnsHostRow}
        item.name = item.name.trim()
        setDnsHostNameError(!item.name)
        if (!item.name) return

        item.note = item.note.trim()
        item.domain = item.domain.trim()
        item.host = processIP(item.host)

        dnsHostKey === -1 ? modeRow.hosts.push(item) : (modeRow.hosts[dnsHostKey] = item)
        handleBackToList()
    }

    const handleHostUpdate = (key: number) => {
        setAction('host')
        setDnsHostKey(key)
        setDnsHostRow(modeRow.hosts[key] || DEFAULT_DNS_HOST_ROW)
    }

    const handleHostDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 "${name}" 吗？`, async () => {
            modeRow.hosts = modeRow.hosts.filter((_, index) => index !== key) || []
        })
    }

    const [hostSortKey, setHostSortKey] = useState(-1)
    const handleHostSortStart = (e: React.MouseEvent, key: number) => {
        e.stopPropagation()
        setServerSortKey(-1)
        if (hostSortKey === -1) {
            setHostSortKey(key)
        } else if (hostSortKey === key) {
            setHostSortKey(-1)
        } else {
            handleHostSortEnd(key)
        }
    }

    const handleHostSortEnd = (key: number) => {
        if (hostSortKey === -1) return
        if (hostSortKey === key) {
            setHostSortKey(-1)
            return
        }

        let hosts = [...modeRow.hosts]
        let [temp] = hosts.splice(hostSortKey, 1)
        hosts.splice(key, 0, temp)
        setHostSortKey(-1)
        modeRow.hosts = hosts
    }

    // ====================================== dnsServer ======================================
    const [dnsServerKey, setDnsServerKey] = useState(-1)
    const [dnsServerRow, setDnsServerRow] = useState<DnsServerRow>(DEFAULT_DNS_SERVER_ROW)
    const [dnsServerNameError, setDnsServerNameError] = useState(false)
    const handleServerCreate = () => {
        setAction('server')
        setDnsServerRow(DEFAULT_DNS_SERVER_ROW)
    }

    const handleServerSubmit = () => {
        let item = {...dnsServerRow}
        item.name = item.name.trim()
        setDnsServerNameError(!item.name)
        if (!item.name) return

        item.note = item.note.trim()
        item.address = item.address.trim()

        if (item.type === 'object') {
            item.domains = processDomain(item.domains)
            item.expectIPs = processIP(item.expectIPs)
            item.clientIP = item.clientIP.trim()
        } else if (item.type === 'address') {
            item = {
                ...DEFAULT_DNS_SERVER_ROW,
                ...{
                    name: item.name,
                    note: item.note,
                    type: item.type,
                    address: item.address,
                }
            }
        }

        if (dnsServerKey === -1) {
            modeRow.servers.push(item)
        } else {
            modeRow.servers[dnsServerKey] = item
        }

        handleBackToList()
    }

    const handleServerRowChange = (type: keyof DnsServerRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (type === 'name') setDnsServerNameError(!value.trim())
        setDnsServerRow({...dnsServerRow, [type]: value})
    }

    const handleServerRowSelectChange = (type: string, value: string) => {
        setDnsServerRow({...dnsServerRow, [type]: value})
    }

    const handleServerRowPortChange = (type: keyof DnsServerRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = Number(e.target.value)
        value = value < 1 ? 0 : value > 65535 ? 65535 : value
        setDnsServerRow({...dnsServerRow, [type]: value || ''})
    }

    const handleServerRowNumberChange = (type: keyof DnsServerRow) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDnsServerRow({...dnsServerRow, [type]: Number(e.target.value) || 0})
    }

    const handleServerRowSwitchChange = (type: string, value: boolean) => {
        setDnsServerRow({...dnsServerRow, [type]: value})
    }

    const [serverSortKey, setServerSortKey] = useState(-1)
    const handleServerSortStart = (e: React.MouseEvent, key: number) => {
        e.stopPropagation()
        setHostSortKey(-1)
        if (serverSortKey === -1) {
            setServerSortKey(key)
        } else if (serverSortKey === key) {
            setServerSortKey(-1)
        } else {
            handleServerSortEnd(key)
        }
    }

    const handleServerSortEnd = (key: number) => {
        if (serverSortKey === -1) return
        if (serverSortKey === key) {
            setServerSortKey(-1)
            return
        }

        let servers = [...modeRow.servers]
        let [temp] = servers.splice(serverSortKey, 1)
        servers.splice(key, 0, temp)
        setServerSortKey(-1)
        modeRow.servers = servers
    }

    const handleServerUpdate = (key: number) => {
        setAction('server')
        setDnsServerKey(key)
        setDnsServerRow(modeRow.servers[key] || DEFAULT_DNS_SERVER_ROW)
    }

    const handleServerDelete = (key: number, name: string) => {
        dialogConfirm('确认删除', `确定要删除 "${name}" 吗？`, async () => {
            modeRow.servers = modeRow.servers.filter((_, index) => index !== key) || []
        })
    }

    const widthSx = {p: 2, width: 580}
    const width2Sx = {...widthSx, pb: 0}

    const {DialogComponent, dialogConfirm} = useDialog()
    return (<>
        <DialogComponent/>
        {action === 'host' ? (
            <Stack spacing={2} sx={widthSx}>
                <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                    <TextField size="small" label="DNS 地址表名称"
                               error={dnsHostNameError} helperText={dnsHostNameError ? "不能为空" : ""}
                               value={dnsHostRow.name} onChange={handleHostRowChange('name')}/>
                    <TextField size="small" label="DNS 地址表描述" value={dnsHostRow.note} onChange={handleHostRowChange('note')} multiline rows={2}/>
                    <TextField size="small" label="DNS 域名" value={dnsHostRow.domain} onChange={handleHostRowChange('domain')}/>
                    <TextField size="small" label="DNS 地址（每行一条）" value={dnsHostRow.host} onChange={handleHostRowChange('host')} multiline rows={2}/>
                </Stack>

                <div className="flex-between">
                    <Button variant="contained" color="info" onClick={handleHostSubmit}>{dnsHostKey === -1 ? '添加' : '修改'}</Button>
                    <Button variant="contained" onClick={handleBackToList}>返回</Button>
                </div>
            </Stack>
        ) : action === 'server' ? (<>
            <DialogContent sx={width2Sx}>
                <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                    <TextField size="small" label="DNS 服务器名称"
                               error={dnsServerNameError} helperText={dnsServerNameError ? "不能为空" : ""}
                               value={dnsServerRow.name} onChange={handleServerRowChange('name')}/>
                    <TextField size="small" label="DNS 服务器描述" value={dnsServerRow.note} onChange={handleServerRowChange('note')} multiline rows={2}/>

                    <TextField select fullWidth size="small" label="DNS 服务器类型" value={dnsServerRow.type} onChange={handleServerRowChange('type')}>
                        <MenuItem value="address">简单类型</MenuItem>
                        <MenuItem value="object">精细类型</MenuItem>
                    </TextField>

                    <TextField size="small" label="DNS 服务器地址" value={dnsServerRow.address} onChange={handleServerRowChange('address')}/>

                    {dnsServerRow.type === 'object' && (<>
                        <TextField size="small" label="DNS 服务器端口" placeholder="不填写默认为: 53" value={dnsServerRow.port} onChange={handleServerRowPortChange('port')}/>
                        <TextField size="small" label="域名列表（每行一条）"
                                   value={dnsServerRow.domains} onChange={handleServerRowChange('domains')} multiline rows={2}/>
                        <TextField size="small" label="验证 IP 范围列表（每行一条）"
                                   value={dnsServerRow.expectIPs} onChange={handleServerRowChange('expectIPs')} multiline rows={2}/>
                        <TextField size="small" label="客户端 IP 地址 (clientIP)" value={dnsServerRow.clientIP} onChange={handleServerRowChange('clientIP')}/>

                        <SelectField
                            label="DNS 查询策略 (queryStrategy)" id="dns-mode-server-query-strategy"
                            value={dnsServerRow.queryStrategy} options={['UseIP', 'UseIPv4', 'UseIPv6']}
                            onChange={(value) => handleServerRowSelectChange('queryStrategy', value)}/>

                        <TextField size="small" label="查询超时时间（单位：毫秒）" value={dnsServerRow.timeoutMs} onChange={handleServerRowNumberChange('timeoutMs')}/>

                        <Stack spacing={0.5}>
                            <div className="flex-between">
                                <Typography variant="body1" sx={{pl: 1}}>跳过 DNS fallback 查询</Typography>
                                <Switch checked={dnsServerRow.skipFallback} onChange={(_, value) => handleServerRowSwitchChange('skipFallback', value)}/>
                            </div>
                            <div className="flex-between">
                                <Typography variant="body1" sx={{pl: 1}}>跳过验证 IP 范围列表</Typography>
                                <Switch checked={dnsServerRow.allowUnexpectedIPs} onChange={(_, value) => handleServerRowSwitchChange('allowUnexpectedIPs', value)}/>
                            </div>
                        </Stack>
                    </>)}
                </Stack>
            </DialogContent>

            <DialogActions sx={{p: 2}}>
                <Stack direction="row" spacing={2} sx={{width: '100%', justifyContent: "space-between", alignItems: "center"}}>
                    <Button variant="contained" color="info" onClick={handleServerSubmit}>{dnsServerKey === -1 ? '添加' : '修改'}</Button>
                    <Button variant="contained" onClick={handleBackToList}>返回</Button>
                </Stack>
            </DialogActions>
        </>) : loading ? (
            <DialogContent sx={widthSx}><LoadingCard height="160px"/></DialogContent>
        ) : (<>
            <DialogContent sx={width2Sx}>
                <Stack spacing={2}>
                    <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                        <TextField size="small" label="模式名称"
                                   error={dnsNameError} helperText={dnsNameError ? "模式名称不能为空" : ""}
                                   value={modeRow.name} onChange={handleRowChange('name')}/>
                        <TextField size="small" label="模式描述" value={modeRow.note} onChange={handleRowChange('note')} multiline rows={2}/>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleHostCreate}>添加 DNS 地址表</Button>
                    </Stack>

                    {modeRow.hosts.length === 0 ? (
                        <ErrorCard errorMsg="暂无 DNS 地址表" height="160px"/>
                    ) : (
                        <TableContainer component={Card}>
                            <Table size="small">
                                <TableBody>
                                    {modeRow.hosts.map((row, key) => (
                                        <TableRow
                                            key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                            className={hostSortKey > -1 ? (hostSortKey === key ? 'sort-current' : 'sort-target') : ''}
                                            onClick={() => handleHostSortEnd(key)}>
                                            <TableCell sx={{p: '6px 12px'}} component="th" scope="row">
                                                <Typography variant="body1" component="div">{row.name}</Typography>
                                                {row.note && <Typography variant="body2" sx={{color: 'text.secondary'}}>{row.note}</Typography>}
                                            </TableCell>
                                            <TableCell sx={{p: '4px 8px'}} width="150" align="right">
                                                <Tooltip arrow title="排序" placement="top">
                                                    <IconButton color="info" onClick={e => handleHostSortStart(e, key)}><OpenWithIcon/></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="修改" placement="top">
                                                    <IconButton color="primary" onClick={() => handleHostUpdate(key)}><EditSquareIcon/></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="删除" placement="top">
                                                    <IconButton color="error" onClick={() => handleHostDelete(key, row.name)}><DeleteIcon/></IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    <Stack direction="row" spacing={2}>
                        <Button variant="contained" color="success" startIcon={<AddIcon/>} onClick={handleServerCreate}>添加 DNS 服务器</Button>
                    </Stack>

                    {modeRow.servers.length === 0 ? (
                        <ErrorCard errorMsg="暂无 DNS 服务器" height="160px"/>
                    ) : (
                        <TableContainer component={Card}>
                            <Table size="small">
                                <TableBody>
                                    {modeRow.servers.map((row, key) => (
                                        <TableRow
                                            key={key} sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                            className={serverSortKey > -1 ? (serverSortKey === key ? 'sort-current' : 'sort-target') : ''}
                                            onClick={() => handleServerSortEnd(key)}>
                                            <TableCell sx={{p: '6px 12px'}} component="th" scope="row">
                                                <Typography variant="body1" component="div">{row.name}</Typography>
                                                {row.note && <Typography variant="body2" sx={{color: 'text.secondary'}}>{row.note}</Typography>}
                                            </TableCell>
                                            <TableCell sx={{p: '4px 8px'}} width="150" align="right">
                                                <Tooltip arrow title="排序" placement="top">
                                                    <IconButton color="info" onClick={e => handleServerSortStart(e, key)}><OpenWithIcon/></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="修改" placement="top">
                                                    <IconButton color="primary" onClick={() => handleServerUpdate(key)}><EditSquareIcon/></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="删除" placement="top">
                                                    <IconButton color="error" onClick={() => handleServerDelete(key, row.name)}><DeleteIcon/></IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    <Stack spacing={2} component={Card} sx={{p: 1, pt: 2}}>
                        <TextField
                            size="small" label="全局客户端 IP 地址 (clientIP)"
                            placeholder="用于 DNS 查询时通知服务器，必须是公网 IP 地址"
                            value={modeRow.clientIP} onChange={handleRowChange('clientIP')}/>

                        <SelectField
                            label="全局 DNS 查询策略 (queryStrategy)" id="dns-mode-query-strategy"
                            value={modeRow.queryStrategy} options={['UseIP', 'UseIPv4', 'UseIPv6']}
                            onChange={(value) => handleRowSelectChange('queryStrategy', value)}/>

                        <Stack spacing={0.5}>
                            <div className="flex-between">
                                <Typography variant="body1" sx={{pl: 1}}>禁用 DNS 缓存</Typography>
                                <Switch checked={modeRow.disableCache} onChange={(_, value) => handleRowSwitchChange('disableCache', value)}/>
                            </div>
                            <div className="flex-between">
                                <Typography variant="body1" sx={{pl: 1}}>禁用 DNS fallback 查询</Typography>
                                <Switch checked={modeRow.disableFallback} onChange={(_, value) => handleRowSwitchChange('disableFallback', value)}/>
                            </div>
                            <div className="flex-between">
                                <Typography variant="body1" sx={{pl: 1}}>优先匹配域名列表命中时，禁用 DNS fallback 查询</Typography>
                                <Switch checked={modeRow.disableFallbackIfMatch} onChange={(_, value) => handleRowSwitchChange('disableFallbackIfMatch', value)}/>
                            </div>
                        </Stack>
                    </Stack>
                </Stack>
            </DialogContent>

            <DialogActions sx={{p: 2}}>
                <Stack direction="row" spacing={2} sx={{width: '100%', justifyContent: "space-between", alignItems: "center"}}>
                    <Button variant="contained" color="info" onClick={handleSubmit}>修改</Button>
                    <Button variant="contained" onClick={handleBack}>取消</Button>
                </Stack>
            </DialogActions>
        </>)}
    </>)
}
