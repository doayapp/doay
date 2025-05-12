import { useState, useEffect, useRef } from 'react'
import {
    Card, IconButton, BottomNavigation, BottomNavigationAction, Paper, Stack, TextField, Tooltip
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

import { readAppConfig, readRayCommonConfig } from "../util/invoke.ts"
import { DEFAULT_APP_CONFIG, DEFAULT_RAY_COMMON_CONFIG } from "../util/config.ts"
import { clipboardWriteText } from "../util/tauri.ts"
import { IS_LINUX, IS_MAC_OS, IS_WINDOWS } from "../util/util.ts"
import { useDebounce } from "../hook/useDebounce.ts"

export const TerminalCmd = () => {
    const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const [rayConfig, setRayConfig] = useState<RayCommonConfig>(DEFAULT_RAY_COMMON_CONFIG)
    const [osType, setOsType] = useState('macOS')
    const loadConfig = useDebounce(async () => {
        let newAppConfig = await readAppConfig()
        if (newAppConfig) setAppConfig(newAppConfig)

        let newRayConfig = await readRayCommonConfig()
        if (newRayConfig) setRayConfig(newRayConfig)

        if (IS_WINDOWS) setOsType('windows')
        if (IS_MAC_OS) setOsType('macOS')
        if (IS_LINUX) setOsType('linux')
    }, 100)
    useEffect(loadConfig, [])

    const getProxySetEnv = () => {
        const {ray_host, ray_http_port, ray_socks_port} = appConfig
        const {http_enable} = rayConfig
        const http_port = http_enable ? ray_http_port : ray_socks_port
        const cmd = osType === 'windows' ? 'set' : 'export'
        return `${cmd} http_proxy=http://${ray_host}:${http_port};\n`
            + `${cmd} https_proxy=http://${ray_host}:${http_port};\n`
            + `${cmd} all_proxy=socks5://${ray_host}:${ray_socks_port}`
    }

    const getProxyUnsetEnv = () => {
        return osType === 'windows' ? 'set http_proxy= & set https_proxy= & set all_proxy=' : 'unset http_proxy https_proxy all_proxy'
    }

    const getProxyGetEnv = () => {
        return osType === 'windows' ? 'set | findstr /i "proxy"' : 'env | grep -i proxy'
    }

    const getProxyWriteEnv = () => {
        const {ray_host, ray_socks_port} = appConfig
        return osType === 'macOS' ? `echo 'export all_proxy="socks5://${ray_host}:${ray_socks_port}"' >> ~/.bash_profile\n`
            + `echo 'export all_proxy="socks5://${ray_host}:${ray_socks_port}"' >> ~/.zshrc`
            : `echo 'export all_proxy="socks5://${ray_host}:${ray_socks_port}"' >> ~/.bashrc`
    }

    const getProxyDeleteEnv = () => {
        return osType === 'macOS' ? `sed -i '' '/export all_proxy=/d' ~/.bash_profile\nsed -i '' '/export all_proxy=/d' ~/.zshrc`
            : `sed -i '/export all_proxy=/d' ~/.bashrc`
    }

    const getProxySourceEnv = () => {
        return osType === 'macOS' ? 'source ~/.bash_profile\nsource ~/.zshrc' : 'source ~/.bashrc'
    }

    const getProxyTestEnv = () => {
        return osType === 'macOS' ? `grep 'proxy' ~/.*rc ~/.bash_profile` : `grep 'proxy' ~/.*rc`
    }

    const getCurl = () => {
        return osType === 'windows' ? 'curl.exe' : 'curl'
    }

    const getProxyTestProxy = () => {
        return `${getCurl()} -v https://www.google.com`
    }

    const getProxyTestSocks = () => {
        return `${getCurl()} -x socks5://${appConfig.ray_host}:${appConfig.ray_socks_port} https://www.google.com`
    }

    const getProxyTestHttp = () => {
        const http_port = rayConfig.http_enable ? appConfig.ray_http_port : appConfig.ray_socks_port
        return `${getCurl()} -x http://${appConfig.ray_host}:${http_port} https://www.google.com`
    }

    const getMyIP = () => `${getCurl()} httpbin.org/ip`
    const getMyIpIp = () => `${getCurl()} myip.ipip.net`
    const getMyIpJson = () => `${getCurl()} https://api.myip.la/cn?json`

    const getNetstat = () => {
        return osType === 'windows' ? 'netstat -ano | findstr LISTENING' : osType === 'linux' ? 'netstat -tulnp' : 'netstat -an | grep LISTEN'
    }

    const getLsof = () => `lsof -i -P | grep LISTEN`

    const timeoutRef = useRef<number>(0)
    const [copiedType, setCopiedType] = useState('')
    const handleCommandCopy = async (type: string) => {
        let content = ''
        if (type === 'SetEnv') {
            content = getProxySetEnv()
        } else if (type === 'UnsetEnv') {
            content = getProxyUnsetEnv()
        } else if (type === 'GetEnv') {
            content = getProxyGetEnv()
        } else if (type === 'WriteEnv') {
            content = getProxyWriteEnv()
        } else if (type === 'DeleteEnv') {
            content = getProxyDeleteEnv()
        } else if (type === 'SourceEnv') {
            content = getProxySourceEnv()
        } else if (type === 'TestProxy') {
            content = getProxyTestProxy()
        } else if (type === 'TestEnv') {
            content = getProxyTestEnv()
        } else if (type === 'TestSocks') {
            content = getProxyTestSocks()
        } else if (type === 'TestHttp') {
            content = getProxyTestHttp()
        } else if (type === 'MyIP') {
            content = getMyIP()
        } else if (type === 'MyIpIp') {
            content = getMyIpIp()
        } else if (type === 'MyIpJson') {
            content = getMyIpJson()
        } else if (type === 'Netstat') {
            content = getNetstat()
        } else if (type === 'Lsof') {
            content = getLsof()
        }
        const ok = await clipboardWriteText(content)
        if (!ok) return

        setCopiedType(type)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setCopiedType(''), 2000)
    }

    return (<>
        <BottomNavigation sx={{mb: 2}} showLabels component={Paper} elevation={4}
                          value={osType}
                          onChange={(_, v) => setOsType(v)}>
            <BottomNavigationAction value="windows" label="Windows"/>
            <BottomNavigationAction value="macOS" label="MacOS"/>
            <BottomNavigationAction value="linux" label="Linux"/>
        </BottomNavigation>

        <Stack spacing={2}>
            <Stack spacing={2} component={Card} elevation={4} sx={{p: 1, pt: 2}}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="设置临时代理 “环境变量‌”" value={getProxySetEnv()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'SetEnv' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('SetEnv')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="移除临时代理 “环境变量‌”" value={getProxyUnsetEnv()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'UnsetEnv' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('UnsetEnv')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="查看代理 “环境变量‌”" value={getProxyGetEnv()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'GetEnv' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('GetEnv')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {(osType === 'macOS' || osType === 'linux') && (
                <Stack spacing={2} component={Card} elevation={4} sx={{p: 1, pt: 2}}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="设置永久代理 “环境变量‌”" value={getProxyWriteEnv()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'WriteEnv' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('WriteEnv')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="移除永久代理 “环境变量‌”" value={getProxyDeleteEnv()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'DeleteEnv' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('DeleteEnv')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="立即生效代理 “环境变量‌”" value={getProxySourceEnv()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'SourceEnv' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('SourceEnv')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="测试代理设置，是否成功" value={getProxyTestEnv()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'TestEnv' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('TestEnv')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="测试代理设置，是否正常" value={getProxyTestProxy()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'TestProxy' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('TestProxy')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            )}

            <Stack spacing={2} component={Card} elevation={4} sx={{p: 1, pt: 2}}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="测试 SOCKS 代理" value={getProxyTestSocks()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'TestSocks' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('TestSocks')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="测试 HTTP 代理" value={getProxyTestHttp()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'TestHttp' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('TestHttp')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Stack spacing={2} component={Card} elevation={4} sx={{p: 1, pt: 2}}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="查看本机公网 IP" value={getMyIP()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'MyIP' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('MyIP')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="查看本机公网 IP & 归属地" value={getMyIpIp()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'MyIpIp' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('MyIpIp')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="查看本机公网 IP & 归属地 (JSON)" value={getMyIpJson()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'MyIpJson' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('MyIpJson')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Stack spacing={2} component={Card} elevation={4} sx={{p: 1, pt: 2}}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField fullWidth multiline size="small" label="查看本机端口" value={getNetstat()}/>
                    <Tooltip arrow placement="right" title={copiedType === 'Netstat' ? '已复制' : '点击复制'}>
                        <IconButton onClick={() => handleCommandCopy('Netstat')}><ContentCopyIcon/></IconButton>
                    </Tooltip>
                </Stack>

                {(osType === 'macOS' || osType === 'linux') && (<>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TextField fullWidth multiline size="small" label="查看本机端口（包含进程名）" value={getLsof()}/>
                        <Tooltip arrow placement="right" title={copiedType === 'Lsof' ? '已复制' : '点击复制'}>
                            <IconButton onClick={() => handleCommandCopy('Lsof')}><ContentCopyIcon/></IconButton>
                        </Tooltip>
                    </Stack>
                </>)}
            </Stack>
        </Stack>
    </>)
}

export default TerminalCmd
