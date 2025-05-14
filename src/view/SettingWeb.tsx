import { useState, useEffect } from 'react'
import {
    Card, Button, Divider, Stack, Switch, TextField, Typography,
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import { validateIp, validatePort } from '../util/util.ts'
import { checkPortAvailable, readAppConfig, setAppConfig, openWebServerDir } from '../util/invoke.ts'
import { DEFAULT_APP_CONFIG } from "../util/config.ts"
import { useDebounce } from "../hook/useDebounce.ts"

export default () => {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const loadConfig = useDebounce(async () => {
        const newConfig = await readAppConfig()
        if (newConfig) setConfig({...DEFAULT_APP_CONFIG, ...newConfig})
    }, 100)
    useEffect(loadConfig, [])

    const [webIpError, setWebIpError] = useState(false)
    const [webPortError, setWebPortError] = useState(false)
    const [webPortErrorText, setWebPortErrorText] = useState('')

    const handleWebServerEnable = (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, web_server_enable: value}))
        setAppConfig('set_web_server_enable', value)
    }

    const setWebServerHostDebounce = useDebounce(async (value: string) => {
        const c = await readAppConfig()
        if (c?.web_server_host !== value) {
            setConfig(prevConfig => ({...prevConfig, web_server_host: value}))
            setAppConfig('set_web_server_host', value)
        }
    }, 1000)
    const handleWebIp = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.trim()
        setConfig(prevConfig => ({...prevConfig, web_server_host: value}))
        const ok = validateIp(value)
        setWebIpError(!ok)
        if (ok) setWebServerHostDebounce(value)
    }

    const setWebServerPortDebounce = useDebounce(async (value: number) => {
        const c = await readAppConfig()
        if (c?.web_server_port !== value) {
            const ok = await checkPortAvailable(value)
            setWebPortError(!ok)
            !ok && setWebPortErrorText('本机端口不可用')
            if (ok) {
                setWebPortErrorText('')
                setConfig(prevConfig => ({...prevConfig, web_server_port: value}))
                setAppConfig('set_web_server_port', value)
            }
        }
    }, 1500)
    const handleWebPort = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value) || 0
        setConfig(prevConfig => ({...prevConfig, web_server_port: value || ""}))
        setWebPortErrorText('')
        const ok = validatePort(value)
        setWebPortError(!ok)
        !ok && setWebPortErrorText('请输入有效的端口号 (1-65535)')
        if (ok) setWebServerPortDebounce(value)
    }

    return (
        <Card>
            <div className="flex-between p2">
                <Typography variant="body1" sx={{pl: 1}}>Web 服务</Typography>
                <Switch checked={config.web_server_enable} onChange={e => handleWebServerEnable(e.target.checked)}/>
            </div>
            <Divider/>
            <Stack direction="row" spacing={2} sx={{p: 2}}>
                <TextField
                    label="本机地址"
                    value={config.web_server_host}
                    onChange={handleWebIp}
                    error={webIpError}
                    helperText={webIpError ? "请输入有效的IP地址" : ""}
                    sx={{flex: 'auto'}}
                />
                <TextField
                    label="Web 端口"
                    value={config.web_server_port}
                    onChange={handleWebPort}
                    error={webPortError}
                    helperText={webPortErrorText}
                    sx={{width: '210px'}}
                />
            </Stack>
            <Stack direction="row" spacing={2} sx={{p: 2, pt: 0}}>
                <Button startIcon={<FolderOpenIcon/>} variant="contained" onClick={openWebServerDir}>打开目录</Button>
                <Button startIcon={<OpenInNewIcon/>} variant="contained" target="_blank"
                        href={`http://${config.web_server_host}:${config.web_server_port}/doay/`}>打开网站</Button>
            </Stack>
        </Card>
    )
}
