import { useState, useEffect, useRef } from 'react'
import {
    Card, Dialog, Stack, Typography, Tooltip,
    TableContainer, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'

import Process from "./Process.tsx"
import { getComponentsJson, getDisksJson, getLoadAverageJson, getNetworksJson, getSysInfoJson } from "../util/invoke.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { useVisibility } from "../hook/useVisibility.ts"
import { IS_LINUX, IS_MAC_OS, calcPct, formatFloat, formatTime, sizeToUnit } from "../util/util.ts"
import { calculateNetworkSpeed, sumNetworks } from "../util/network.ts"

const SHOW_LOAD_AVERAGE = IS_MAC_OS || IS_LINUX
const BASE = IS_MAC_OS ? 1000 : 1024

// 硬件温度
type TemperatureInfo = {
    label: string;
    temperature: string;
};

export const SysInfo = () => {
    const [sysInfo, setSysInfo] = useState<any>({})
    const [loadAverage, setLoadAverage] = useState<any>({})
    const [disk, setDisk] = useState<any>([])
    const [network, setNetwork] = useState<any>([])
    const [components, setComponents] = useState<any>([])

    const prevNetworkRef = useRef({up: 0, down: 0})
    const [networkSpeed, setNetworkSpeed] = useState({upSpeed: 0, downSpeed: 0})
    const [open, setOpen] = useState(false)
    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    const loadData = useDebounce(async () => {
        // console.log('loadData', new Date().toISOString())
        let info = await getSysInfoJson()
        if (info) setSysInfo(info)

        if (SHOW_LOAD_AVERAGE) {
            let la = await getLoadAverageJson()
            if (la) setLoadAverage(la)
        }

        let c = await getComponentsJson()
        if (c) {
            c = formatAndSortByLabel(c)
            setComponents(c)
        }

        let disks = await getDisksJson()
        if (disks) setDisk(sumDiskSpaces(disks))

        let currentNetwork = await getNetworksJson()
        if (currentNetwork) {
            const net = sumNetworks(currentNetwork)
            setNetwork(net)
            const speed = calculateNetworkSpeed(prevNetworkRef.current, net)
            setNetworkSpeed(speed)
            prevNetworkRef.current = net
        }
    }, 300)

    // 可见时，自动刷新数据
    const intervalRef = useRef<number>(0)
    const isVisibility = useVisibility()
    useEffect(() => {
        loadData()
        if (isVisibility && !open) intervalRef.current = setInterval(loadData, 1000)
        return () => clearInterval(intervalRef.current)
    }, [isVisibility, open])

    const formatComponentsLabel = (label: string) => {
        if (label === 'PECI CPU') return 'CPU 核心'
        if (label === 'CPU Proximity') return 'CPU 外壳'
        if (label === 'Battery') return '电池'
        return label
    }

    function formatAndSortByLabel(data: TemperatureInfo[]): TemperatureInfo[] {
        return data
            .map(item => ({...item, label: formatComponentsLabel(item.label)}))
            .sort((a, b) => a.label.localeCompare(b.label))
    }

    const sumDiskSpaces = (disks: any[]) => {
        const nameArr: string[] = []
        let total_space = 0
        let available_space = 0
        for (const disk of disks) {
            if (nameArr.includes(disk.name)) continue
            nameArr.push(disk.name)
            total_space += disk.total_space
            available_space += disk.available_space
        }
        return {total_space, available_space, used_space: total_space - available_space}
    }

    return (<>
        <Dialog fullScreen open={open} onClose={handleClose}>
            <Process handleClose={handleClose}/>
        </Dialog>

        <Stack spacing={2}>
            <TableContainer elevation={4} component={Card}>
                <Table className="table" size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell>主机名称</TableCell><TableCell align="right">{sysInfo.host_name}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>系统版本</TableCell><TableCell align="right">{sysInfo.long_os_version}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>内核版本</TableCell><TableCell align="right">{sysInfo.kernel_long_version}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>已运行</TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" component="span" color="info">{formatTime(sysInfo.uptime)}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>进程数</TableCell>
                            <TableCell align="right">
                                <Typography className="process-but" variant="body2" color="secondary" onClick={handleOpen}>{sysInfo.process_len}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>硬盘 (disks)</TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" component="span" color="info" sx={{pr: 2}}>{sizeToUnit(disk.available_space, BASE)} 可用</Typography>
                                {sizeToUnit(disk.used_space, BASE)} / {sizeToUnit(disk.total_space, BASE)}
                                <Typography variant="body2" component="span" color="warning" sx={{pl: 2}}>{calcPct(disk.used_space, disk.total_space)}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>内存 (memory)</TableCell>
                            <TableCell align="right">
                                {sizeToUnit(sysInfo.used_memory)} / {sizeToUnit(sysInfo.total_memory)}
                                <Typography variant="body2" component="span" color="warning" sx={{pl: 2}}>{calcPct(sysInfo.used_memory, sysInfo.total_memory)}</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>交换分区 (swap)</TableCell>
                            <TableCell align="right">
                                {sysInfo.total_swap > 0 ? (<>
                                    {sizeToUnit(sysInfo.used_swap)} / {sizeToUnit(sysInfo.total_swap)}
                                    <Typography variant="body2" component="span" color="warning" sx={{pl: 2}}>{calcPct(sysInfo.used_swap, sysInfo.total_swap)}</Typography>
                                </>) : '-'}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CPU 使用</TableCell>
                            <TableCell align="right">
                                <Typography variant="body2" component="span" color="warning">{formatFloat(sysInfo.global_cpu_usage, 1)}%</Typography>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CPU 架构</TableCell><TableCell align="right">{sysInfo.cpu_arch}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CPU 核数</TableCell><TableCell align="right">{sysInfo.cpu_len}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>CPU 物理核数</TableCell><TableCell align="right">{sysInfo.physical_core_count}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            {SHOW_LOAD_AVERAGE && <TableContainer elevation={4} component={Card}>
                <Table className="table" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell align="right">1 分钟</TableCell>
                            <TableCell align="right">5 分钟</TableCell>
                            <TableCell align="right">15 分钟</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell component="th" scope="row">
                                <div className="flex-center-gap1">
                                    系统负载平均值
                                    <Tooltip arrow placement="top" title="当超过 CPU 核数，则表示超负载运行">
                                        <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                    </Tooltip>
                                </div>
                            </TableCell>
                            <TableCell align="right">{formatFloat(loadAverage.one)}</TableCell>
                            <TableCell align="right">{formatFloat(loadAverage.five)}</TableCell>
                            <TableCell align="right">{formatFloat(loadAverage.fifteen)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>}

            <TableContainer elevation={4} component={Card}>
                <Table className="table" size="small">
                    <TableBody>
                        <TableRow>
                            <TableCell>网络上传总量</TableCell>
                            <TableCell align="right"><Typography variant="body2" component="span" color="info">{sizeToUnit(network.up)}</Typography></TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>网络下载总量</TableCell>
                            <TableCell align="right"><Typography variant="body2" component="span" color="info">{sizeToUnit(network.down)}</Typography></TableCell>
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

            <TableContainer elevation={4} component={Card}>
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

            {components?.length > 0 && (
                <TableContainer elevation={4} component={Card}>
                    <Table className="table" size="small">
                        <TableBody>
                            {components.map((row: any, key: number) => (
                                <TableRow key={key}>
                                    <TableCell>{row.label}</TableCell>
                                    <TableCell align="right">{formatFloat(row.temperature, 1)} ℃</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Stack>
    </>)
}

export default SysInfo
