import { useState, useEffect } from 'react'
import { Card, Divider, ListItem, ListItemButton, Typography, Switch, Tooltip } from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'

import { readAppConfig, saveAppConfig } from '../util/invoke.ts'
import { DEFAULT_APP_CONFIG } from "../util/config.ts"
import { reloadProxyPAC } from "../util/proxy.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { IS_WINDOWS } from "../util/util.ts"

export default () => {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const loadConfig = useDebounce(async () => {
        const newConfig = await readAppConfig()
        if (newConfig) setConfig({...DEFAULT_APP_CONFIG, ...newConfig})
    }, 100)
    useEffect(loadConfig, [])

    const handleAutoSetupPac = async (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_pac: value}))
        await saveAppConfig('set_auto_setup_pac', value)
        if (value) {
            // 开启 PAC 自动配置时，关闭其他配置，避免影响 PAC 规则
            setConfig(prevConfig => ({
                ...prevConfig,
                auto_setup_socks: false,
                auto_setup_http: false,
                auto_setup_https: false,
            }))

            await reloadProxyPAC()
        }
    }

    const handleAutoSetupSocks = async (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_socks: value}))

        // Windows 系统下，只允许开启一个代理设置
        if (IS_WINDOWS && value) {
            setConfig(prevConfig => ({
                ...prevConfig,
                auto_setup_pac: false,
                auto_setup_http: false,
            }))

            if (config.auto_setup_pac) await saveAppConfig('set_auto_setup_pac', false)
            if (config.auto_setup_http) await saveAppConfig('set_auto_setup_http', false)
        }

        await saveAppConfig('set_auto_setup_socks', value)
    }

    const handleAutoSetupHttp = async (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_http: value}))

        // Windows 系统下，只允许开启一个代理设置
        if (IS_WINDOWS && value) {
            setConfig(prevConfig => ({
                ...prevConfig,
                auto_setup_pac: false,
                auto_setup_socks: false,
            }))

            if (config.auto_setup_pac) await saveAppConfig('set_auto_setup_pac', false)
            if (config.auto_setup_socks) await saveAppConfig('set_auto_setup_socks', false)
        }

        await saveAppConfig('set_auto_setup_http', value)
    }

    const handleAutoSetupHttps = async (value: boolean) => {
        setConfig(prevConfig => ({...prevConfig, auto_setup_https: value}))
        await saveAppConfig('set_auto_setup_https', value)
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
            {!IS_WINDOWS && (
                <ListItem disablePadding>
                    <ListItemButton sx={{cursor: 'default'}}>
                        <div className="flex-between w100">
                            <Typography variant="body1" sx={{pl: 1}}>HTTPS 代理</Typography>
                            <Switch checked={config.auto_setup_https} onChange={e => handleAutoSetupHttps(e.target.checked)}/>
                        </div>
                    </ListItemButton>
                </ListItem>
            )}
        </Card>
    )
}
