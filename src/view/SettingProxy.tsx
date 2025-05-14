import { useState, useEffect } from 'react'
import { Card, Divider, ListItem, ListItemButton, Typography, Switch, Tooltip } from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'

import { readAppConfig, setAppConfig } from '../util/invoke.ts'
import { DEFAULT_APP_CONFIG } from "../util/config.ts"
import { reloadProxyPAC } from "../util/proxy.ts"
import { useDebounce } from "../hook/useDebounce.ts"

export default () => {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const loadConfig = useDebounce(async () => {
        const newConfig = await readAppConfig()
        if (newConfig) setConfig({...DEFAULT_APP_CONFIG, ...newConfig})
    }, 100)
    useEffect(loadConfig, [])

    const handleAutoSetupPac = (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_pac: value}))
        setAppConfig('set_auto_setup_pac', value)
        if (value) {
            reloadProxyPAC()

            // 开启 PAC 自动配置时，关闭其他配置，避免影响 PAC 规则
            setConfig(prevConfig => ({
                ...prevConfig,
                auto_setup_socks: false,
                auto_setup_http: false,
                auto_setup_https: false,
            }))
        }
    }

    const handleAutoSetupSocks = (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_socks: value}))
        setAppConfig('set_auto_setup_socks', value)
    }

    const handleAutoSetupHttp = (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_http: value}))
        setAppConfig('set_auto_setup_http', value)
    }

    const handleAutoSetupHttps = (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_https: value}))
        setAppConfig('set_auto_setup_https', value)
    }

    return (
        <Card>
            <Typography variant="h6" sx={{p: 2, pl: 3, pb: 1.5}}>
                <div className="flex-center-gap1">
                    自动设置
                    <Tooltip arrow placement="right" title="开启后，将自动修改操作系统代理设置">
                        <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                    </Tooltip>
                </div>
            </Typography>
            <Divider/>
            <ListItem disablePadding>
                <ListItemButton sx={{cursor: 'default'}}>
                    <div className="flex-between w100">
                        <Typography variant="body1" sx={{pl: 1}}>PAC 自动配置代理</Typography>
                        <Switch checked={config.auto_setup_pac} onChange={e => handleAutoSetupPac(e.target.checked)}/>
                    </div>
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton sx={{cursor: 'default'}}>
                    <div className="flex-between w100">
                        <Typography variant="body1" sx={{pl: 1}}>SOCKS 代理</Typography>
                        <Switch checked={config.auto_setup_socks} onChange={e => handleAutoSetupSocks(e.target.checked)}/>
                    </div>
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton sx={{cursor: 'default'}}>
                    <div className="flex-between w100">
                        <Typography variant="body1" sx={{pl: 1}}>HTTP 代理</Typography>
                        <Switch checked={config.auto_setup_http} onChange={e => handleAutoSetupHttp(e.target.checked)}/>
                    </div>
                </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
                <ListItemButton sx={{cursor: 'default'}}>
                    <div className="flex-between w100">
                        <Typography variant="body1" sx={{pl: 1}}>HTTPS 代理</Typography>
                        <Switch checked={config.auto_setup_https} onChange={e => handleAutoSetupHttps(e.target.checked)}/>
                    </div>
                </ListItemButton>
            </ListItem>
        </Card>
    )
}
