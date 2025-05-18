import React, { useState, useEffect, useRef } from 'react'
import {
    Button, Card, Chip, Dialog, Switch, Stack, Typography, Tooltip, TextField,
    TableContainer, Table, TableBody, TableCell, TableRow,
} from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import GitHubIcon from '@mui/icons-material/GitHub'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

import {
    getNetworksJson, getSysInfoJson, readAppConfig, readRayConfig,
    safeInvoke, saveAppConfig
} from "../util/invoke.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { cutStr, formatTime, formatTimestamp, sizeToUnit } from "../util/util.ts"
import { calculateNetworkSpeed, sumNetworks } from "../util/network.ts"
import { useVisibility } from "../hook/useVisibility.ts"
import { clipboardWriteText, isVisibleWindow } from "../util/tauri.ts"

export default () => {
    const [rayEnable, setRayEnable] = useState(false)

    const [bootTime, setBootTime] = useState(0) // 开机时间
    const [runTime, setRunTime] = useState(0) // 运行时间
    const [cpuArch, setCpuArch] = useState('')
    const [doayVersion, setDoayVersion] = useState('')
    const [rustVersion, setRustVersion] = useState('')

    const loadConfig = useDebounce(async () => {
        const appConf = await readAppConfig()
        const rayEnable = Boolean(appConf && appConf.ray_enable)
        setRayEnable(rayEnable)

        let info = await getSysInfoJson()
        if (info?.uptime && info.uptime > 0) {
            const bootTime = Math.floor(Date.now() / 1000) - info.uptime
            setBootTime(Math.max(0, bootTime))
            setRunTime(info.uptime)
        }
        if (info?.cpu_arch) setCpuArch(info.cpu_arch)

        const version = await safeInvoke('get_version')
        if (version?.doay) setDoayVersion(version.doay)
        if (version?.rustc) setRustVersion(getRustVersion(version.rustc))

        await getNetworkData()
    }, 100)
    useEffect(loadConfig, [])

    const getRustVersion = (input: string): string => {
        const match = input.match(/rustc\s+(\d+\.\d+\.\d+)/)
        return match ? match[1] : ''
    }

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
            }, 1000)
        }

        return () => clearInterval(intervalRef.current)
    }, [isVisibility, isVisible, errorEnabled, bootTime])

    // ==================================== ray enable ====================================
    const handleRayEnable = async (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.checked
        if (value) {
            let c = await readRayConfig()
            if (!c || !c.inbounds || !c.outbounds) {
                setErrorEnabled(true)
                setTimeout(() => setErrorEnabled(false), 2500)
                window.__SNACKBAR__.showSnackbar('无服务器可启用', 'error', 2000)
                return
            }
        }

        setRayEnable(value)
        await saveAppConfig('set_ray_enable', value)
    }

    const [openUserAgent, setOpenUserAgent] = useState(false)
    const handleShowUserAgent = () => {
        setOpenUserAgent(true)
    }

    const handleClose = () => {
        setOpenUserAgent(false)
    }

    // ============================== copy ==============================
    const [isCopied, setIsCopied] = useState(false)
    const handleUserAgentCopy = async (content: string) => {
        const ok = await clipboardWriteText(content)
        if (!ok) return
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (<>
        <Dialog open={openUserAgent} onClose={handleClose}>
            <Stack spacing={1} sx={{p: 1, width: '600px'}}>
                <Stack spacing={2} component={Card} elevation={5} sx={{p: 1, pt: 2}}>
                    <TextField size="small" multiline disabled label="User Agent" value={navigator.userAgent}/>
                </Stack>
                <Stack>
                    <div className="flex-between">
                        <div>
                            <Button variant="contained" color="info" startIcon={<ContentCopyIcon/>} onClick={() => handleUserAgentCopy(navigator.userAgent)}>复制</Button>
                            {isCopied && <Chip label="复制成功" color="success" size="small" sx={{ml: 1}}/>}
                        </div>
                        <Button variant="contained" onClick={handleClose}>取消</Button>
                    </div>
                </Stack>
            </Stack>
        </Dialog>

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
                        <TableCell>CPU 架构</TableCell><TableCell align="right">{cpuArch}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Doay 版本</TableCell><TableCell align="right">{doayVersion}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Rust 版本</TableCell><TableCell align="right">{rustVersion}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>UA 信息</TableCell>
                        <TableCell align="right">
                            <div className="hover-effect" onClick={handleShowUserAgent}>{cutStr(navigator.userAgent, 20)}</div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>

        <Stack direction="row" justifyContent="center" spacing={2}>
            <Button startIcon={<OpenInNewIcon/>} color="success" variant="contained" target="_blank" href="https://doay.pages.dev">官方网站</Button>
            <Button startIcon={<GitHubIcon/>} color="info" variant="contained" target="_blank" href="https://github.com/doayapp/doay">查看源码</Button>
            <Button startIcon={<CloudDownloadIcon/>} color="warning" variant="contained" target="_blank" href="https://github.com/doayapp/doay/releases">最新版本</Button>
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
    </>)
}
