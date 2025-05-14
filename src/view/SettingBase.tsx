import { useState, useEffect } from 'react'
import {
    Card, Divider, Typography, Switch, Button, ButtonGroup,
    FormControl, Select, MenuItem, SelectChangeEvent
} from '@mui/material'

import { useTheme } from '../context/ThemeProvider.tsx'
import { readAppConfig, setAppConfig } from '../util/invoke.ts'
import { DEFAULT_APP_CONFIG } from "../util/config.ts"
import { isAutoStartEnabled, saveAutoStart } from "../util/tauri.ts"
import { useDebounce } from "../hook/useDebounce.ts"

export default () => {
    const {mode, toggleMode} = useTheme()
    const handleTheme = (newMode: 'light' | 'dark' | 'system') => {
        toggleMode(newMode as 'light' | 'dark' | 'system')
    }

    const [autoStart, setAutoStart] = useState(false)
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const loadConfig = useDebounce(async () => {
        const newConfig = await readAppConfig()
        if (newConfig) setConfig({...DEFAULT_APP_CONFIG, ...newConfig})

        setAutoStart(await isAutoStartEnabled())
    }, 100)
    useEffect(loadConfig, [])

    const handleAutoStart = async (value: boolean) => {
        setAutoStart(value)
        await saveAutoStart(value)
    }

    const handleAppLogLevel = (event: SelectChangeEvent) => {
        const value = event.target.value as AppConfig['app_log_level']
        setConfig(prevConfig => ({...prevConfig, app_log_level: value}))
        setAppConfig('set_app_log_level', value)
    }

    return (
        <Card>
            <div className="flex-between p2">
                <Typography variant="body1">外观</Typography>
                <ButtonGroup variant="contained">
                    <Button onClick={() => handleTheme('light')} variant={mode === 'light' ? 'contained' : 'outlined'}>亮色</Button>
                    <Button onClick={() => handleTheme('dark')} variant={mode === 'dark' ? 'contained' : 'outlined'}>暗色</Button>
                    <Button onClick={() => handleTheme('system')} variant={mode === 'system' ? 'contained' : 'outlined'}>跟随系统</Button>
                </ButtonGroup>
            </div>
            <Divider/>
            <div className="flex-between p2">
                <Typography variant="body1">开机启动</Typography>
                <Switch checked={autoStart} onChange={e => handleAutoStart(e.target.checked)}/>
            </div>
            <Divider/>
            <div className="flex-between p2">
                <Typography variant="body1">日志级别</Typography>
                <FormControl sx={{minWidth: 120}} size="small">
                    <Select value={config.app_log_level} onChange={handleAppLogLevel}>
                        <MenuItem value="none">关闭日志</MenuItem>
                        <MenuItem value="error">错误日志</MenuItem>
                        <MenuItem value="warn">警告日志</MenuItem>
                        <MenuItem value="info">普通日志</MenuItem>
                        <MenuItem value="debug">调试日志</MenuItem>
                        <MenuItem value="trace">追踪日志</MenuItem>
                    </Select>
                </FormControl>
            </div>
        </Card>
    )
}
