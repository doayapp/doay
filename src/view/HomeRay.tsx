import { useState, useEffect, useRef } from 'react'
import {
    BottomNavigation, BottomNavigationAction, Card, Paper, Typography,
    TableContainer, Table, TableBody, TableCell, TableRow,
} from '@mui/material'
import InputIcon from '@mui/icons-material/Input'
import OutputIcon from '@mui/icons-material/Output'

import { invokeString, readAppConfig, readRayCommonConfig } from "../util/invoke.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { formatSecond, formatTimestamp, sizeToUnit } from "../util/util.ts"
import { getStatsData } from "../util/network.ts"
import { DEFAULT_RAY_COMMON_CONFIG } from "../util/config.ts"
import { useVisibility } from "../hook/useVisibility.ts"
import { ErrorCard, LoadingCard } from "../component/useCard.tsx"

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

export default () => {
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')

    const [rayEnable, setRayEnable] = useState(false)

    const [rayCommonConfig, setRayCommonConfig] = useState<RayCommonConfig>(DEFAULT_RAY_COMMON_CONFIG)
    const [xrayVersion, setXrayVersion] = useState('')
    const [goVersion, setGoVersion] = useState('')

    const loadConfig = useDebounce(async () => {
        setLoading(false)
        const appConf = await readAppConfig()
        const rayEnable = Boolean(appConf?.ray_enable)
        setRayEnable(rayEnable)
        if (!rayEnable) {
            setErrorMsg('暂无服务器启用')
            return
        }

        let rayConf = await readRayCommonConfig()
        if (rayConf) {
            setRayCommonConfig(rayConf)
        } else {
            rayConf = rayCommonConfig
        }
        if (!rayConf.stats_enable) {
            setErrorMsg('未开启流量统计')
            return
        }

        const rayVersion = await invokeString('get_ray_version')
        const xrayMatch = rayVersion.match(/^Xray\s+(\S+)\s+/i)
        const goMatch = rayVersion.match(/\(go(\S+)\s+[^)]+\)/i)
        setXrayVersion(xrayMatch?.[1] || '')
        setGoVersion(goMatch?.[1] || '')

        if (rayEnable && rayConf.stats_enable) await loadStats(rayConf.stats_port)
    }, 100)
    useEffect(loadConfig, [])

    // ==================================== stats ====================================
    const [boundType, setBoundType] = useState('outbound')
    const [inbound, setInbound] = useState<Inbound | null>()
    const [outbound, setOutbound] = useState<Outbound | null>()
    const [memStats, setMemStats] = useState<any>({})
    const loadStats = async (port: number | '') => {
        if (!port) return
        const r = await getStatsData(Number(port)) as any
        if (r) {
            r.memStats && setMemStats(r.memStats)
            r.inbound && setInbound(r.inbound)
            r.outbound && setOutbound(r.outbound)
        }
    }

    // ==================================== interval ====================================
    const intervalRef = useRef<number>(0)
    const isVisibility = useVisibility()
    useEffect(() => {
        if (isVisibility && rayEnable && rayCommonConfig?.stats_enable && rayCommonConfig?.stats_port) {
            intervalRef.current = setInterval(async () => {
                await loadStats(rayCommonConfig.stats_port)
            }, 1000)
        }

        return () => clearInterval(intervalRef.current)
    }, [isVisibility, rayEnable, rayCommonConfig])

    return (<>
        {loading ? (
            <LoadingCard height="300px"/>
        ) : errorMsg ? (
            <ErrorCard errorMsg={errorMsg} height="300px"/>
        ) : rayEnable && rayCommonConfig.stats_enable && (<>
            <TableContainer elevation={2} component={Card}>
                <Table className="table" size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell>Xray 版本</TableCell><TableCell align="right">{xrayVersion}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Golang 版本</TableCell><TableCell align="right">{goVersion}</TableCell>
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

            <BottomNavigation
                sx={{mb: 2}} showLabels component={Paper} elevation={2}
                value={boundType}
                onChange={(_, v) => setBoundType(v)}
            >
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
        </>)}
    </>)
}
