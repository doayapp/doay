import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Chip, Stack, Checkbox, Button, Typography, useMediaQuery,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Menu, MenuItem, IconButton, Drawer, Tooltip, Paper,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DeleteIcon from '@mui/icons-material/Delete'
import DoubleArrowIcon from '@mui/icons-material/DoubleArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'

import { JsonCodeViewer } from "../component/CodeViewer.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { useServerImport } from "../component/useServerImport.tsx"
import {
    readAppConfig, readRayCommonConfig, saveRayConfig, getDoayAppDir,
    restartRay, readServerList, saveServerList, readRuleConfig, readRuleDomain,
    readRuleModeList, readDnsConfig, readDnsModeList, saveAppConfig,
} from "../util/invoke.ts"
import { getConf } from "../util/serverConf.ts"
import {
    DEFAULT_APP_CONFIG,
    DEFAULT_DNS_CONFIG,
    DEFAULT_DNS_MODE_LIST,
    DEFAULT_RAY_COMMON_CONFIG,
    DEFAULT_RULE_CONFIG,
    DEFAULT_RULE_DOMAIN,
    DEFAULT_RULE_MODE_LIST
} from "../util/config.ts"
import { dnsToConf } from "../util/dns.ts"
import { ruleToConf } from "../util/rule.ts"
import { clipboardReadText, clipboardWriteText } from "../util/tauri.ts"
import { formatSecond } from "../util/util.ts"
import { runWithConcurrency } from "../util/concurrency.ts"
import { generateServersPort, serverSpeedTest } from "../util/serverSpeed.ts"
import { useDebounce } from "../hook/useDebounce.ts"

let SPEED_TEST_SERVERS_CACHE = {}
let SPEED_TEST_LAST_DATE = 0

const Server: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(1), [setNavState])
    const navigate = useNavigate()
    const isMediumScreen = useMediaQuery('(max-width: 1100px)')

    const [serverList, setServerList] = useState<ServerList>()
    const [selectedServers, setSelectedServers] = useState<number[]>([])
    const [selectedAll, setSelectedAll] = useState(false)
    const [showAction, setShowAction] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const loadList = useDebounce(async () => {
        const d = await readServerList()
        if (d) {
            const list = d as ServerList
            setServerList(list)

            await initConfig()
            serverAllSpeedTest(list)
        } else {
            setServerList([])
            setErrorMsg('暂无服务器')
        }
    }, 100)
    useEffect(loadList, [])

    const serverAllSpeedTest = (serverList: ServerList) => {
        if (Date.now() - SPEED_TEST_LAST_DATE < 1000 * 60 * 30) return // 更新频率，不要超过 30 分钟
        serversSpeedTest(serverList)
        SPEED_TEST_LAST_DATE = Date.now()
    }

    // ============================== create & update ==============================
    const handleCreate = () => {
        navigate(`/server_create`)
    }

    const handleUpdate = () => {
        navigate(`/server_update?key=${selectedKey}`)
    }

    // ============================== clipboard import ==============================
    const handleClipboardImport = async () => {
        try {
            const text = await clipboardReadText()
            if (text) {
                await useServerImport(text, window.__SNACKBAR__.showSnackbar, null, loadList)
            } else {
                window.__SNACKBAR__.showSnackbar('剪切板没有内容', 'error')
            }
        } catch (e) {
            window.__SNACKBAR__.showSnackbar('读取剪切板失败', 'error')
        }
    }

    const handleImport = () => {
        navigate(`/server_import`)
    }

    // ============================== export ==============================
    const handleExport = () => {
        navigate(`/server_export`, {state: {selectedKeys: selectedServers}})
    }

    // ============================== select ==============================
    const handleSelectAll = (checked: boolean) => {
        if (!serverList) return
        setSelectedServers(checked ? serverList.map((_, k) => k) : [])
        setSelectedAll(checked)
        setShowAction(checked)
    }

    const handleSelectServer = (key: number, checked: boolean) => {
        const newSelected = checked ? [...selectedServers, key] : selectedServers.filter(k => k !== key)
        setSelectedServers(newSelected)
        setSelectedAll(newSelected.length === serverList?.length)
        setShowAction(newSelected.length > 0)
    }

    const updateServerList = (newServerList: ServerList) => {
        setServerList(newServerList)
        clearSelected()
    }

    const clearSelected = () => {
        setSelectedServers([])
        setSelectedAll(false)
        setShowAction(false)
    }

    // ============================== menu ==============================
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const [selectedKey, setSelectedKey] = useState<number>(-1)

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, key: number) => {
        setAnchorEl(event.currentTarget)
        setSelectedKey(key)
    }

    const handleMenuClose = () => {
        setAnchorEl(null)
        setSelectedKey(-1)
    }

    // ============================== init config ==============================
    let appDir = useRef<string>('')
    let config = useRef<AppConfig | null>(null)
    let rayCommonConfig = useRef<RayCommonConfig | null>(null)
    let ruleConfig = useRef<RuleConfig | null>(null)
    let ruleDomain = useRef<RuleDomain | null>(null)
    let ruleModeList = useRef<RuleModeList | null>(null)
    let dnsConfig = useRef<DnsConfig | null>(null)
    let dnsModeList = useRef<DnsModeList | null>(null)
    const initConfig = async () => {
        if (!appDir.current) appDir.current = await getDoayAppDir()
        if (!config.current) config.current = await readAppConfig() || DEFAULT_APP_CONFIG
        if (!rayCommonConfig.current) rayCommonConfig.current = await readRayCommonConfig() || DEFAULT_RAY_COMMON_CONFIG

        if (!ruleConfig.current) ruleConfig.current = await readRuleConfig() || DEFAULT_RULE_CONFIG
        if (!ruleDomain.current) ruleDomain.current = await readRuleDomain() || DEFAULT_RULE_DOMAIN
        if (!ruleModeList.current) ruleModeList.current = await readRuleModeList() || DEFAULT_RULE_MODE_LIST

        if (!dnsConfig.current) dnsConfig.current = await readDnsConfig() || DEFAULT_DNS_CONFIG
        if (!dnsModeList.current) dnsModeList.current = await readDnsModeList() || DEFAULT_DNS_MODE_LIST
    }

    const getServerConf = async (key: number) => {
        if (!appDir.current || !config.current || !rayCommonConfig.current) return
        if (!dnsConfig.current || !dnsModeList.current) return
        if (!ruleConfig.current || !ruleDomain.current || !ruleModeList.current) return

        if (!serverList?.[key]) {
            window.__SNACKBAR__.showSnackbar('获取配置信息失败', 'error')
            return false
        }

        const conf = getConf(serverList[key], appDir.current, config.current, rayCommonConfig.current)
        if (conf) {
            const dns = dnsToConf(dnsConfig.current, dnsModeList.current)
            const routing = ruleToConf(ruleConfig.current, ruleDomain.current, ruleModeList.current)
            return {...conf, ...dns, ...routing}
        } else {
            window.__SNACKBAR__.showSnackbar('生成 conf 失败', 'error')
            return false
        }
    }

    // ============================== enable ==============================
    const handleEnable = async (key: number) => {
        const conf = await getServerConf(key)
        if (!conf) return

        const ok = await saveRayConfig(conf)
        if (!ok) return

        const setOk = await setServerEnable(key)
        if (setOk) {
            const conf = config.current
            if (!conf) return

            if (conf.ray_enable) {
                // 如果开启，则重启服务
                await restartRay()
            } else {
                // 如果没有开启，则开启
                await saveAppConfig('set_ray_enable', true)
            }
        }

        handleMenuClose()
    }

    const setServerEnable = async (key: number) => {
        if (!serverList) return false
        const newServerList = serverList.map((server, index) => {
            server.on = index === key ? 1 : 0
            return server
        })
        const ok = await saveServerList(newServerList)
        if (!ok) {
            window.__SNACKBAR__.showSnackbar('设置启用失败', 'error')
        }
        updateServerList(newServerList)
        return ok
    }

    // ============================== view config ==============================
    const [openDrawer, setOpenDrawer] = useState(false)
    const [rayConfigJson, setRayConfigJson] = useState('')
    const handleCloseDrawer = () => setOpenDrawer(false)
    const handleViewConfig = async () => {
        setOpenDrawer(true)

        const conf = await getServerConf(selectedKey)
        if (!conf) return

        setRayConfigJson(JSON.stringify(conf, null, 2))
        handleMenuClose()
    }

    // ============================== delete ==============================
    const handleDelete = () => {
        dialogConfirm('确认删除', `确定要删除这个服务器吗？`, async () => {
            const newServerList = serverList?.filter((_, index) => index !== selectedKey) || []
            const ok = await saveServerList(newServerList)
            if (!ok) {
                window.__SNACKBAR__.showSnackbar('删除失败', 'error')
            } else {
                updateServerList(newServerList)
            }
            handleMenuClose()
        })
    }

    const handleBatchDelete = () => {
        if (selectedServers.length < 1 || !serverList) return

        dialogConfirm('确认删除', `确定要删除这 ${selectedServers.length} 个服务器吗？`, async () => {
            const newServerList = serverList.filter((_, index) => !selectedServers.includes(index)) || []
            const ok = await saveServerList(newServerList)
            if (!ok) {
                window.__SNACKBAR__.showSnackbar('删除失败', 'error')
            } else {
                updateServerList(newServerList)
            }
        })
    }

    // ============================== speed test ==============================
    const handleSpeedTest = async () => {
        if (selectedServers.length < 1 || !serverList) return

        const testServerList = serverList.filter((_, index) => selectedServers.includes(index)) || []
        serversSpeedTest(testServerList)
        clearSelected()
        SPEED_TEST_LAST_DATE = Date.now()
    }

    const serversSpeedTest = useDebounce(async (serverList: ServerList) => {
        if (serverList.length < 1) return
        const servers = await generateServersPort(serverList)
        const tasks = servers.map((row) => () => testServerSpeed(row.server, row.port))
        await runWithConcurrency(tasks, 5)
    }, 300)

    const [testList, setTestList] = useState<Record<string, string>>(SPEED_TEST_SERVERS_CACHE)
    const setServersSpeedTest = (id: string, value: string) => {
        setTestList(prev => {
            if ('testStart' !== value) SPEED_TEST_SERVERS_CACHE = {...SPEED_TEST_SERVERS_CACHE, [id]: value}
            return {...prev, [id]: value}
        })
    }

    const testServerSpeed = async (server: ServerRow, port: number) => {
        if (!appDir.current || !rayCommonConfig.current) return

        setServersSpeedTest(server.id, 'testStart')
        const {result, elapsed} = await serverSpeedTest(server, appDir.current, rayCommonConfig.current, port)
        if (!result?.ok) {
            setServersSpeedTest(server.id, 'testError')
        } else {
            setServersSpeedTest(server.id, formatSecond(elapsed))
        }
    }

    // ============================== drag sort ==============================
    /*const [enableDragSort, setEnableDragSort] = useState(false)
    const [dragIndex, setDragIndex] = useState<number>(-1)
    const [dragIsChange, setDragIsChange] = useState(false)
    const handleSaveServerList = useDebounce(async (dragIsChange: boolean, serverList: ServerList) => {
        if (dragIsChange && serverList && serverList.length > 0) {
            setDragIsChange(false)
            const ok = await saveServerList(serverList)
            if (!ok) window.__SNACKBAR__.showSnackbar('保存失败', 'error')
            // console.log('save ok')
        }
    }, 300)

    useEffect(() => {
        const handleMouseUp = () => {
            setDragIndex(-1)
            setDragIsChange(prevIsChange => {
                setServerList(prevServerList => {
                    handleSaveServerList(prevIsChange, prevServerList)
                    return prevServerList
                })
                return prevIsChange
            })
        }
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    const handleMouseStart = (key: number) => {
        if (!enableDragSort) return
        setDragIndex(key)
    }

    const handleMouseEnd = (e: React.MouseEvent) => {
        if (!enableDragSort) return
        e.stopPropagation()
        setDragIndex(-1)
        handleSaveServerList(dragIsChange, serverList)
    }

    const handleMouseEnter = (key: number) => {
        if (!enableDragSort) return
        if (dragIndex > -1 && dragIndex !== key && serverList) {
            const newServerList = [...serverList]
            const [draggedItem] = newServerList.splice(dragIndex, 1)
            newServerList.splice(key, 0, draggedItem)
            setServerList(newServerList)
            setDragIndex(key)
            setDragIsChange(true)
        }
    }*/

    // ============================== sort ==============================
    const [serverSortKey, setServerSortKey] = useState(-1)
    const handleServerSortStart = (e: React.MouseEvent, key: number) => {
        e.stopPropagation()
        if (serverSortKey === -1) {
            setServerSortKey(key)
        } else if (serverSortKey === key) {
            setServerSortKey(-1)
        } else {
            handleServerSortEnd(key).catch(_ => 0)
        }
    }

    const handleServerSortEnd = async (key: number) => {
        if (serverSortKey === -1 || !serverList) return
        if (serverSortKey === key) {
            setServerSortKey(-1)
            return
        }

        let newList = [...serverList]
        let [temp] = newList.splice(serverSortKey, 1)
        newList.splice(key, 0, temp)
        setServerSortKey(-1)

        const ok = await saveServerList(newList)
        if (!ok) {
            window.__SNACKBAR__.showSnackbar('保存排序失败', 'error')
        } else {
            updateServerList(newList)
        }
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleCopyJson = async () => {
        await clipboardWriteText(rayConfigJson)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 1000)
    }

    const {DialogComponent, dialogConfirm} = useDialog()
    const height = 'calc(100vh - 70px)'
    return (<>
        <DialogComponent/>
        <Stack direction="row" spacing={1} sx={{mb: 1}}>
            <Button variant="contained" color="secondary" startIcon={<AddIcon/>} onClick={handleCreate}>添加</Button>
            <Button variant="contained" color="success" startIcon={<ContentPasteGoIcon/>} onClick={handleClipboardImport}>剪切板导入</Button>
            <Button variant="contained" color="warning" startIcon={<FileUploadIcon/>} onClick={handleImport}>导入</Button>
            {showAction && (<>
                <Button variant="contained" color="info" startIcon={<FileDownloadIcon/>} onClick={handleExport}>导出</Button>
                <Button variant="contained" color="error" onClick={handleBatchDelete}>批量删除</Button>
                <Button variant="contained" color="warning" onClick={handleSpeedTest}>测速</Button>
            </>)}
        </Stack>
        {!serverList ? (
            <LoadingCard height={height}/>
        ) : serverList.length === 0 ? (
            <ErrorCard errorMsg={errorMsg} height={height}/>
        ) : (
            <TableContainer component={Card}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox checked={selectedAll} onChange={(e) => handleSelectAll(e.target.checked)}/>
                            </TableCell>
                            <TableCell sx={{py: 1}}>服务器名称</TableCell>
                            {!isMediumScreen && (<>
                                <TableCell sx={{width: '200px'}}>服务器地址</TableCell>
                                <TableCell sx={{width: '100px'}}>协议类型</TableCell>
                                <TableCell sx={{width: '200px'}}>安全类型</TableCell>
                            </>)}
                            <TableCell width="150"/>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {serverList.map((row, key) => (
                            <TableRow
                                key={key} hover
                                sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                className={serverSortKey > -1 ? (serverSortKey === key ? 'sort-current' : 'sort-target') : ''}
                                onClick={() => handleServerSortEnd(key)}
                            >
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedServers.includes(key)}
                                        onChange={(e) => handleSelectServer(key, e.target.checked)}/>
                                </TableCell>
                                <TableCell component="th" scope="row">
                                    <div className="flex-between">
                                        <div>
                                            {!isMediumScreen ? row.ps : (<>
                                                <Typography>{row.ps}</Typography>
                                                <Typography variant="body2" color="warning">{row.host}</Typography>
                                                <Typography variant="body2" color="secondary">{row.type}
                                                    <Typography color="info" component="span" ml={1}>{row.scy}</Typography>
                                                </Typography>
                                            </>)}
                                        </div>
                                        {testList[row.id] === 'testStart' ? (
                                            <Chip label="测速中" color="warning" size="small"/>
                                        ) : testList[row.id] === 'testError' ? (
                                            <Chip label="测速失败" color="error" size="small"/>
                                        ) : testList[row.id] && (
                                            <Chip label={testList[row.id]} color="success" size="small"/>
                                        )}
                                    </div>
                                </TableCell>
                                {!isMediumScreen && (<>
                                    <TableCell>{row.host}</TableCell>
                                    <TableCell>{row.type}</TableCell>
                                    <TableCell>{row.scy}</TableCell>
                                </>)}
                                <TableCell align="right" sx={{p: '8px'}}>
                                    <Tooltip arrow title="启用" placement="top">
                                        {Boolean(row.on) ? (
                                            <IconButton sx={{color: 'info.main'}} onClick={_ => handleEnable(key)}><ToggleOnIcon fontSize="medium"/></IconButton>
                                        ) : (
                                            <IconButton sx={{color: 'grey.500'}} onClick={_ => handleEnable(key)}><ToggleOffIcon fontSize="medium"/></IconButton>
                                        )}
                                    </Tooltip>
                                    <Tooltip arrow title="排序" placement="top">
                                        <IconButton color="info" onClick={e => handleServerSortStart(e, key)}><OpenWithIcon/></IconButton>
                                    </Tooltip>
                                    <IconButton onClick={(e) => handleMenuClick(e, key)}><MoreVertIcon/></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleUpdate}><EditIcon sx={{mr: 1}} fontSize="small"/>修改</MenuItem>
            <MenuItem onClick={handleViewConfig}><VisibilityIcon sx={{mr: 1}} fontSize="small"/>配置</MenuItem>
            <MenuItem onClick={handleDelete}><DeleteIcon sx={{mr: 1}} fontSize="small"/>删除</MenuItem>
        </Menu>
        <Drawer open={openDrawer} anchor="right" onClose={handleCloseDrawer} transitionDuration={0}>
            <Stack sx={{p: 1, width: 'calc(100vw - 140px)'}} spacing={1}>
                <div className="flex-between">
                    <IconButton onClick={handleCloseDrawer}><DoubleArrowIcon/></IconButton>
                </div>
                <Card elevation={4}>
                    <Paper elevation={2} sx={{py: 0.5, px: 1.5, mb: '1px', borderRadius: '8px 8px 0 0'}}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1">Xray 配置</Typography>
                            <Tooltip arrow placement="left" title={isCopied ? '已复制' : '点击复制'}>
                                <IconButton size="small" onClick={handleCopyJson}><ContentCopyIcon fontSize="small"/></IconButton>
                            </Tooltip>
                        </Stack>
                    </Paper>
                    <JsonCodeViewer value={rayConfigJson} height="calc(100vh - 110px)"/>
                </Card>
            </Stack>
        </Drawer>
    </>)
}

export default Server
