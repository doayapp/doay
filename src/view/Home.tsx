import { useState, useEffect, useRef } from 'react'
import {
    BottomNavigation, BottomNavigationAction, Button,
    Card, Paper, Stack, Typography, Switch, Tooltip,
    TableContainer, Table, TableBody, TableCell, TableRow,
} from '@mui/material'
import InputIcon from '@mui/icons-material/Input'
import OutputIcon from '@mui/icons-material/Output'
import HelpIcon from '@mui/icons-material/Help'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GitHubIcon from '@mui/icons-material/GitHub'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'

import { useSnackbar } from "../component/useSnackbar.tsx"
import {
    getNetworksJson, getSysInfoJson, invokeString,
    readAppConfig, readRayCommonConfig, readRayConfig,
    safeInvoke, setAppConfig
} from "../util/invoke.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { formatSecond, formatTime, formatTimestamp, sizeToUnit } from "../util/util.ts"
import { calculateNetworkSpeed, getStatsData, sumNetworks } from "../util/network.ts"
import { DEFAULT_RAY_COMMON_CONFIG } from "../util/config.ts"
import { useVisibility } from "../hook/useVisibility.ts"
import { isVisibleWindow } from "../util/tauri.ts"

interface Inbound {
    totalUp: number; // 总上传
    totalDown: number; // 总下载
    httpUp: number; // HTTP 上传
    httpDown: number; // HTTP 下载
    socksUp: number; // SOCKS 上传
    socksDown: number; // SOCKS 下载
}

interface Outbound {
    totalUp: number; // 总上传
    totalDown: number; // 总下载
    proxyUp: number; // 代理上传
    proxyDown: number; // 代理下载
    directUp: number; // 直连上传
    directDown: number; // 直连下载
}

interface VersionInfo {
    doay: string;
    rust: string;
    xray: string;
    go: string;
}

interface XrayVersionInfo {
    xray: string;
    go: string;
}

let isVisited = false

const Home: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(0), [setNavState])

    // 从配置文件中读取配置信息
    const [rayEnable, setRayEnable] = useState(false)
    const [rayCommonConfig, setRayCommonConfig] = useState<RayCommonConfig>(DEFAULT_RAY_COMMON_CONFIG)
    const loadConfig = useDebounce(async () => {
        await getVersion()

        const appConf = await readAppConfig()
        const rayEnable = Boolean(appConf && appConf.ray_enable)
        setRayEnable(rayEnable)

        let rayConf = await readRayCommonConfig()
        if (rayConf) {
            setRayCommonConfig(rayConf)
        } else {
            rayConf = rayCommonConfig
        }

        await getSysInfo()
        await getNetworkData()

        // 如果 xray 服务还没启动完成，读取 API 会失败，设计一个变量，控制首次访问不读取
        if (isVisited && rayEnable && rayConf.stats_enable) await loadStats(rayConf.stats_port)

        isVisited = true
    }, 100)
    useEffect(loadConfig, [])

    // ==================================== version ====================================
    const [versionInfo, setVersionInfo] = useState<VersionInfo>({
        doay: '',
        rust: '',
        xray: '',
        go: ''
    })
    const getVersion = async () => {
        let r = {...versionInfo}
        const version = await safeInvoke('get_version')
        if (version) {
            r.doay = version.doay || ''
            r.rust = getRustVersion(version.rustc || '')
        }

        const rayVersion = await invokeString('get_ray_version')
        if (rayVersion) {
            r = {...r, ...parseXrayVersion(rayVersion)}
        }
        setVersionInfo(r)
    }

    const getRustVersion = (input: string): string => {
        const match = input.toString().match(/rustc\s+(\d+\.\d+\.\d+)/)
        return match ? match[1] : ''
    }

    const parseXrayVersion = (input: string): XrayVersionInfo => {
        const xrayRegex = /^Xray\s+(\S+)\s+/i
        const goRegex = /\(go(\S+)\s+[^)]+\)/i
        const xrayMatch = input.match(xrayRegex)
        const goMatch = input.match(goRegex)
        return {
            xray: xrayMatch?.[1] || '',
            go: goMatch?.[1] || '',
        }
    }

    // ==================================== stats ====================================
    const [boundType, setBoundType] = useState('outbound')
    const [inbound, setInbound] = useState<Inbound | null>()
    const [outbound, setOutbound] = useState<Outbound | null>()
    const [memStats, setMemStats] = useState<any>({})
    const loadStats = async (port: number | '') => {
        if (!port) return
        const r = await getStatsData(Number(port)) as any
        if (r) {
            r.inbound && setInbound(r.inbound)
            r.outbound && setOutbound(r.outbound)
            r.memStats && setMemStats(r.memStats)
        }
    }

    // ==================================== system info ====================================
    const [sysInfo, setSysInfo] = useState<any>({})
    const [bootTime, setBootTime] = useState(0) // 开机时间
    const [runTime, setRunTime] = useState(0) // 运行时间
    const getSysInfo = async () => {
        let info = await getSysInfoJson()
        if (info) {
            setSysInfo(info)
            if (info.uptime && info.uptime > 0) {
                const bootTime = Math.floor(Date.now() / 1000) - info.uptime
                setBootTime(Math.max(0, bootTime))
                setRunTime(info.uptime)
            }
        }
    }

    // ==================================== interval ====================================
    const [errorEnabled, setErrorEnabled] = useState(false)
    const intervalRef = useRef<number>(0)
    const [isVisible, setIsVisible] = useState(false)
    const isVisibility = useVisibility()
    useEffect(() => {
        setTimeout(async () => {
            const isVisible = await isVisibleWindow()
            setIsVisible(isVisible)
        }, 0)

        if (isVisibility && isVisible && !errorEnabled && bootTime) {
            intervalRef.current = setInterval(async () => {
                const runTime = Math.floor(Date.now() / 1000) - bootTime
                setRunTime(Math.max(0, runTime))

                await getNetworkData()

                if (rayEnable && rayCommonConfig?.stats_enable && rayCommonConfig?.stats_port) {
                    await loadStats(rayCommonConfig.stats_port)
                }
            }, 1000)
        }

        return () => clearInterval(intervalRef.current)
    }, [isVisibility, isVisible, errorEnabled, bootTime, rayEnable, rayCommonConfig])

    // ==================================== network ====================================
    const [network, setNetwork] = useState<any>([])
    const [networkSpeed, setNetworkSpeed] = useState({upSpeed: 0, downSpeed: 0})
    const prevNetworkRef = useRef({up: 0, down: 0})

    const getNetworkData = async () => {
        let currentNetwork = await getNetworksJson()
        if (currentNetwork) {
            const net = sumNetworks(currentNetwork)
            setNetwork(net)
            const speed = calculateNetworkSpeed(prevNetworkRef.current, net)
            setNetworkSpeed(speed)
            prevNetworkRef.current = net
        }
    }

    // ==================================== ray enable ====================================
    const handleRayEnable = async (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.checked
        if (value) {
            let c = await readRayConfig()
            if (!c || !c.inbounds || !c.outbounds) {
                setErrorEnabled(true)
                setTimeout(() => setErrorEnabled(false), 2500)
                showSnackbar('无服务器可启用', 'error', 2000)
                return
            }
        }

        setRayEnable(value)
        setAppConfig('set_ray_enable', value)
    }

    // const pSx = {p: 2, borderRadius: 2, width: '100%', height: `calc(100vh - 20px)`, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center'}
    const pSx = {p: 2, borderRadius: 2, width: '100%', height: `calc(100vh - 20px)`, overflow: 'auto'}

    const {SnackbarComponent, showSnackbar} = useSnackbar()
    return (<>
        <SnackbarComponent/>
        <Paper className="scr-none" elevation={5} sx={pSx}>
            <Stack spacing={2} sx={{width: 620, m: 'auto'}}>
                <Stack direction="row" elevation={2} component={Card} sx={{p: 1, justifyContent: 'space-between', alignItems: 'center'}}>
                    <Typography variant="body1" sx={{paddingLeft: 1}}>Xray 服务</Typography>
                    <Switch checked={rayEnable} onChange={handleRayEnable} sx={{transform: 'scale(1.3)'}}/>
                </Stack>

                <TableContainer elevation={2} component={Card}>
                    <Table className="table" size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell>开机时间</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" component="span">{formatTimestamp(bootTime)}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>已经运行</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" component="span" color="info">{formatTime(runTime)}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>CPU 架构</TableCell><TableCell align="right">{sysInfo.cpu_arch}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Doay 版本</TableCell><TableCell align="right">{versionInfo.doay}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Rust 版本</TableCell><TableCell align="right">{versionInfo.rust}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <Stack direction="row" justifyContent="center" spacing={2}>
                    <Button startIcon={<OpenInNewIcon/>} variant="contained" target="_blank" href="https://doay.pages.dev">官方网站</Button>
                    <Button startIcon={<GitHubIcon/>} variant="contained" target="_blank" href="https://github.com/doooay/doay">查看源码</Button>
                    <Button startIcon={<CloudDownloadIcon/>} variant="contained" target="_blank" href="https://github.com/doooay/doay/releases">最新版本</Button>
                </Stack>

                <TableContainer elevation={2} component={Card}>
                    <Table className="table" size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell>上传速率</TableCell>
                                <TableCell align="right">{sizeToUnit(networkSpeed.upSpeed)}/s</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>下载速率</TableCell>
                                <TableCell align="right">{sizeToUnit(networkSpeed.downSpeed)}/s</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                <TableContainer elevation={2} component={Card}>
                    <Table className="table" size="small">
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <div className="flex-center-gap1">
                                        网络总量
                                        <Tooltip arrow placement="right" title="开机以来的总数据">
                                            <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" component="span" color="warning">{sizeToUnit(network.up + network.down)}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>网络上传总量</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" component="span" color="info">{sizeToUnit(network.up)}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>网络下载总量</TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" component="span" color="info">{sizeToUnit(network.down)}</Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>回环流出总量</TableCell>
                                <TableCell align="right">{sizeToUnit(network.loUp)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>回环流入总量</TableCell>
                                <TableCell align="right">{sizeToUnit(network.loDown)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>

                {rayEnable && rayCommonConfig.stats_enable && (<>
                    <BottomNavigation sx={{mb: 2}} showLabels component={Paper} elevation={2}
                                      value={boundType}
                                      onChange={(_, v) => setBoundType(v)}>
                        <BottomNavigationAction value="inbound" label="入站数据" icon={<InputIcon/>}/>
                        <BottomNavigationAction value="outbound" label="出站数据" icon={<OutputIcon/>}/>
                    </BottomNavigation>

                    {boundType === 'inbound' && inbound && (<>
                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>总流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.totalUp + inbound.totalDown)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>总上传流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.totalUp)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>总下载流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.totalDown)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>HTTP 总流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.httpUp + inbound.httpDown)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>HTTP 上传流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.httpUp)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>HTTP 下载流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.httpDown)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>SOCKS 总流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.socksUp + inbound.socksDown)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>SOCKS 上传流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.socksUp)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>SOCKS 下载流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(inbound.socksDown)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>)}

                    {boundType === 'outbound' && outbound && (<>
                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>总流量</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" component="span" color="warning">{sizeToUnit(outbound.totalUp + outbound.totalDown)}</Typography>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>总上传流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(outbound.totalUp)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>总下载流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(outbound.totalDown)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>代理总流量</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" component="span" color="info">{sizeToUnit(outbound.proxyUp + outbound.proxyDown)}</Typography>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>代理上传流量</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" component="span" color="info">{sizeToUnit(outbound.proxyUp)}</Typography>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>代理下载流量</TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" component="span" color="info">{sizeToUnit(outbound.proxyDown)}</Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer elevation={2} component={Card}>
                            <Table className="table" size="small">
                                <TableBody>
                                    <TableRow>
                                        <TableCell>直连总流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(outbound.directUp + outbound.directDown)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>直连上传流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(outbound.directUp)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>直连下载流量</TableCell>
                                        <TableCell align="right">{sizeToUnit(outbound.directDown)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>)}

                    <TableContainer elevation={2} component={Card}>
                        <Table className="table" size="small">
                            <TableBody>
                                <TableRow>
                                    <TableCell>Xray 版本</TableCell><TableCell align="right">{versionInfo.xray}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Golang 版本</TableCell><TableCell align="right">{versionInfo.go}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>当前内存使用</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" component="span" color="info">{sizeToUnit(memStats.currentAlloc)}</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>系统内存分配</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" component="span" color="info">{sizeToUnit(memStats.sys)}</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>累计内存分配</TableCell>
                                    <TableCell align="right">{sizeToUnit(memStats.totalAlloc)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>GC 次数</TableCell>
                                    <TableCell align="right">{memStats.gcCount || 0}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>GC 总耗时</TableCell>
                                    <TableCell align="right">{formatSecond(memStats.pauseTotalMs)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>上次 GC 时间</TableCell>
                                    <TableCell align="right">{formatTimestamp(memStats.lastGC)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </>)}
            </Stack>
        </Paper>
    </>)
}

export default Home
