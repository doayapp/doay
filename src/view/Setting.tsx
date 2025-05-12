import { useState, useEffect } from 'react'
import {
    Paper, Box, Card, Divider,
    Tabs, Tab,
    ListItem, ListItemButton,
    Stack,
    Typography,
    Switch, Slider, Tooltip,
    Button, ButtonGroup, TextField,
    FormControl, FormControlLabel, Checkbox,
    Select, MenuItem, SelectChangeEvent
} from '@mui/material'
import HelpIcon from '@mui/icons-material/Help'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import { useTheme } from '../context/ThemeProvider.tsx'
import { validateIp, validatePort } from '../util/util.ts'
import {
    checkPortAvailable,
    readAppConfig, setAppConfig, readRayCommonConfig,
    openWebServerDir, readRayConfig,
} from '../util/invoke.ts'
import {
    saveRayLogLevel, saveRayStatsEnable, saveRayStatsPort,
    saveRayHost, saveRaySocksPort, saveRayHttpPort,
    saveRaySocksEnable, saveRayHttpEnable,
    saveRaySocksUdp,
    saveRaySocksSniffing, saveRaySocksDestOverride,
    saveRayOutboundsMux, saveRayOutboundsConcurrency
} from "../util/ray.ts"
import { DEFAULT_APP_CONFIG, DEFAULT_RAY_COMMON_CONFIG } from "../util/config.ts"
import { reloadProxyPAC } from "../util/proxy.ts"
import { isAutoStartEnabled, saveAutoStart } from "../util/tauri.ts"
import { useDebounce } from "../hook/useDebounce.ts"

const Setting: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(6), [setNavState])

    // 从上下文中获取当前主题模式和切换模式的函数
    const {mode, toggleMode} = useTheme()
    const handleTheme = (newMode: string) => {
        toggleMode(newMode as 'light' | 'dark' | 'system')
    }

    // 用于记录当前激活的选项卡索引，初始值为0（即第一个选项卡）
    const [activeTab, setActiveTab] = useState(0)
    const handleTab = (value: number) => {
        setActiveTab(value)
    }

    const [autoStart, setAutoStart] = useState(false)
    const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG)
    const [rayCommonConfig, setRayCommonConfig] = useState<RayCommonConfig>(DEFAULT_RAY_COMMON_CONFIG)
    const loadConfig = useDebounce(async () => {
        setAutoStart(await isAutoStartEnabled())

        const newConfig = await readAppConfig()
        if (newConfig) setConfig({...DEFAULT_APP_CONFIG, ...newConfig})

        const newRayCommonConfig = await readRayCommonConfig()
        if (newRayCommonConfig) setRayCommonConfig({...DEFAULT_RAY_COMMON_CONFIG, ...newRayCommonConfig})
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

    // ================================== system proxy ==================================
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

    // ================================== ray setting ==================================
    const handleRayLogLevel = async (event: SelectChangeEvent) => {
        const value = event.target.value as RayCommonConfig['ray_log_level']
        const newConf = {...rayCommonConfig, ray_log_level: value}
        setRayCommonConfig(newConf)
        await saveRayLogLevel(value, newConf)
    }

    const handleRayStatsEnable = async (value: boolean) => {
        const newConf = {...rayCommonConfig, stats_enable: value}
        setRayCommonConfig(newConf)
        await saveRayStatsEnable(value, newConf)
    }

    const [rayStatsPortError, setRayStatsPortError] = useState(false)
    const [rayStatsPortErrorText, setRayStatsPortErrorText] = useState('')
    const saveRayStatsPortDebounce = useDebounce(async (value: number, rayCommonConfig: RayCommonConfig) => {
        let rayConfig = await readRayConfig()
        if (rayConfig?.stats_port !== value) {
            const ok = await checkPortAvailable(value)
            setRayStatsPortError(!ok)
            !ok && setRayStatsPortErrorText('本机端口不可用')
            if (ok) {
                setRayStatsPortErrorText('')
                if (value) await saveRayStatsPort(rayConfig, rayCommonConfig)
            }
        }
    }, 1500)
    const handleRayStatsPort = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value) || 0
        const newConf = {...rayCommonConfig, stats_port: value || ""} as RayCommonConfig
        setRayCommonConfig(newConf)

        setRayStatsPortErrorText('')
        const ok = validatePort(value)
        setRayStatsPortError(!ok)
        !ok && setRayStatsPortErrorText('请输入有效的端口号 (1-65535)')
        if (ok) saveRayStatsPortDebounce(value, newConf)
    }

    // ================================== ray host & port ==================================
    const [rayIpError, setRayIpError] = useState(false)
    const [raySocksPortError, setRaySocksPortError] = useState(false)
    const [raySocksPortErrorText, setRaySocksPortErrorText] = useState('')
    const [rayHttpPortError, setRayHttpPortError] = useState(false)
    const [rayHttpPortErrorText, setRayHttpPortErrorText] = useState('')

    const saveRayHostDebounce = useDebounce(async (value: string) => {
        let c = await readAppConfig()
        if (c?.ray_host !== value) {
            setConfig(prevConfig => ({...prevConfig, ray_host: value}))
            setAppConfig('set_ray_host', value)
            await saveRayHost(value)
        }
    }, 1000)
    const handleRayHost = (value: string) => {
        value = value.trim()
        setConfig(prevConfig => ({...prevConfig, ray_host: value}))
        const ok = validateIp(value)
        setRayIpError(!ok)
        if (ok) saveRayHostDebounce(value)
    }

    const saveRaySocksPortDebounce = useDebounce(async (value: number) => {
        let c = await readAppConfig()
        if (c?.ray_socks_port !== value) {
            const ok = await checkPortAvailable(value)
            setRaySocksPortError(!ok)
            !ok && setRaySocksPortErrorText('本机端口不可用')
            if (ok) {
                setRaySocksPortErrorText('')
                setConfig(prevConfig => ({...prevConfig, ray_socks_port: value}))
                setAppConfig('set_ray_socks_port', value)
                await saveRaySocksPort(value)
            }
        }
    }, 1500)
    const handleRaySocksPort = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value) || 0
        setConfig(prevConfig => ({...prevConfig, ray_socks_port: value || ""}))
        setRaySocksPortErrorText('')
        const ok = validatePort(value)
        setRaySocksPortError(!ok)
        !ok && setRaySocksPortErrorText('请输入有效的端口号 (1-65535)')
        if (ok) saveRaySocksPortDebounce(value)
    }

    const saveRayHttpPortDebounce = useDebounce(async (value: number) => {
        let c = await readAppConfig()
        if (c?.ray_http_port !== value) {
            const ok = await checkPortAvailable(value)
            setRayHttpPortError(!ok)
            !ok && setRayHttpPortErrorText('本机端口不可用')
            if (ok) {
                setRayHttpPortErrorText('')
                setConfig(prevConfig => ({...prevConfig, ray_http_port: value}))
                setAppConfig('set_ray_http_port', value)
                await saveRayHttpPort(value)
            }
        }
    }, 1500)
    const handleRayHttpPort = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value) || 0
        setConfig(prevConfig => ({...prevConfig, ray_http_port: value || ""}))
        setRayHttpPortErrorText('')
        const ok = validatePort(value)
        setRayHttpPortError(!ok)
        !ok && setRayHttpPortErrorText('请输入有效的端口号 (1-65535)')
        if (ok) saveRayHttpPortDebounce(value)
    }

    // ================================== ray socks & http ==================================
    const handleRaySocksEnabled = async (value: boolean) => {
        const newConf = {...rayCommonConfig, socks_enable: value}
        setRayCommonConfig(newConf)
        await saveRaySocksEnable(value, config, newConf)
        setTimeout(() => handleAutoSetupSocks(value), 200)
    }

    const handleRayHttpEnabled = async (value: boolean) => {
        const newConf = {...rayCommonConfig, http_enable: value}
        setRayCommonConfig(newConf)
        await saveRayHttpEnable(value, config, newConf)
        setTimeout(() => handleAutoSetupHttp(value), 200)
        setTimeout(() => handleAutoSetupHttps(value), 400)
    }

    // ================================== ray socks more ==================================
    const handleRaySocksUdp = async (value: boolean) => {
        const newConf = {...rayCommonConfig, socks_udp: value}
        setRayCommonConfig(newConf)
        await saveRaySocksUdp(value, newConf)
    }

    const handleRaySocksSniffing = async (value: boolean) => {
        const newConf = {...rayCommonConfig, socks_sniffing: value}
        setRayCommonConfig(newConf)
        await saveRaySocksSniffing(value, newConf)
    }

    const handleDestOverride = async (option: "http" | "tls" | "quic" | "fakedns" | "fakedns+others") => {
        const oldValue = rayCommonConfig.socks_sniffing_dest_override
        const newValue = oldValue.includes(option) ? oldValue.filter(item => item !== option) : [...oldValue, option]
        const newConf = {...rayCommonConfig, socks_sniffing_dest_override: newValue}
        setRayCommonConfig(newConf)
        await saveRaySocksDestOverride(newValue, newConf)
    }

    const handleRayOutboundsMux = async (value: boolean) => {
        const newConf = {...rayCommonConfig, outbounds_mux: value}
        setRayCommonConfig(newConf)
        await saveRayOutboundsMux(value, newConf)
    }

    const saveRayOutboundsConcurrencyDebounce = useDebounce(async (value: number, updatedConfig: RayCommonConfig) => {
        await saveRayOutboundsConcurrency(value, updatedConfig)
    }, 1000)
    const handleRayOutboundsConcurrency = async (value: number) => {
        const newConf = {...rayCommonConfig, outbounds_concurrency: value}
        setRayCommonConfig(newConf)
        saveRayOutboundsConcurrencyDebounce(value, newConf)
    }

    // ================================== web setting ==================================
    // 用于记录当前 Web 服务的设置
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

    const wSx = {m: '0 auto', maxWidth: 660}
    const destOverride = rayCommonConfig.socks_sniffing_dest_override
    return (
        <Paper elevation={3} sx={{borderRadius: 2, height: 'calc(100vh - 20px)', overflow: 'visible'}}>
            <Paper elevation={1} sx={{display: 'flex', justifyContent: 'center', borderRadius: '8px 8px 0 0'}}>
                <Tabs value={activeTab} onChange={(_, newValue) => handleTab(newValue)} aria-label="设置导航">
                    <Tab label="基本设置"/>
                    <Tab label="代理设置"/>
                    <Tab label="Ray 设置"/>
                    <Tab label="Web 设置"/>
                </Tabs>
            </Paper>

            <Box className="scr-none" sx={{p: 2, height: 'calc(100% - 48px)', overflow: 'auto'}}>
                {activeTab === 0 ? (
                    <Card sx={wSx}>
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
                ) : activeTab === 1 ? (
                    <Card sx={wSx}>
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
                ) : activeTab === 2 ? (
                    <Card sx={wSx}>
                        <div className="flex-between p2">
                            <Typography variant="body1">Ray 日志级别</Typography>
                            <FormControl sx={{minWidth: 120}} size="small">
                                <Select value={rayCommonConfig.ray_log_level} onChange={handleRayLogLevel}>
                                    <MenuItem value="none">关闭日志</MenuItem>
                                    <MenuItem value="error">错误日志</MenuItem>
                                    <MenuItem value="warning">警告日志</MenuItem>
                                    <MenuItem value="info">普通日志</MenuItem>
                                    <MenuItem value="debug">调试日志</MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                        <Divider/>
                        <div className="flex-between p1">
                            <Typography variant="body1" sx={{pl: 1}}>流量统计</Typography>
                            <Switch checked={rayCommonConfig.stats_enable} onChange={e => handleRayStatsEnable(e.target.checked)}/>
                        </div>
                        {rayCommonConfig.stats_enable && (
                            <Stack direction="row" sx={{p: 2, pt: 0}}>
                                <TextField
                                    fullWidth
                                    label="API 端口"
                                    variant="standard"
                                    value={rayCommonConfig.stats_port}
                                    onChange={handleRayStatsPort}
                                    error={rayStatsPortError}
                                    helperText={rayStatsPortErrorText}
                                />
                            </Stack>
                        )}
                        <Divider/>
                        <Stack direction="row" spacing={2} sx={{p: 2}}>
                            <TextField
                                label="本机地址"
                                variant="standard"
                                value={config.ray_host}
                                onChange={e => handleRayHost(e.target.value)}
                                error={rayIpError}
                                helperText={rayIpError ? "请输入有效的IP地址" : ""}
                                sx={{flex: 'auto'}}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2} sx={{p: 2, pt: 0}}>
                            <TextField
                                label="SOCKS 端口"
                                variant="standard"
                                value={config.ray_socks_port}
                                onChange={handleRaySocksPort}
                                error={raySocksPortError}
                                helperText={raySocksPortErrorText}
                                sx={{flex: 1}}
                            />
                            <TextField
                                label="HTTP 端口"
                                variant="standard"
                                value={config.ray_http_port}
                                onChange={handleRayHttpPort}
                                error={rayHttpPortError}
                                helperText={rayHttpPortErrorText}
                                sx={{flex: 1}}
                            />
                        </Stack>
                        <Divider/>
                        <div className="flex-between p1">
                            <Typography variant="body1" sx={{pl: 1}}>SOCKS 服务</Typography>
                            <Switch disabled checked={rayCommonConfig.socks_enable} onChange={e => handleRaySocksEnabled(e.target.checked)}/>
                        </div>
                        <Divider/>
                        <div className="flex-between p1">
                            <Typography variant="body1" sx={{pl: 1}}>HTTP 服务</Typography>
                            <Switch checked={rayCommonConfig.http_enable} onChange={e => handleRayHttpEnabled(e.target.checked)}/>
                        </div>
                        {rayCommonConfig.socks_enable && (<>
                            <Divider/>
                            <div className="flex-between p1">
                                <Typography variant="body1" sx={{pl: 1}}>UDP 协议</Typography>
                                <Switch checked={rayCommonConfig.socks_udp} onChange={e => handleRaySocksUdp(e.target.checked)}/>
                            </div>
                            <Divider/>
                            <div className="flex-between p1">
                                <Typography variant="body1" sx={{pl: 1}}>Sniffing 探测</Typography>
                                <Switch checked={rayCommonConfig.socks_sniffing} onChange={e => handleRaySocksSniffing(e.target.checked)}/>
                            </div>
                            {rayCommonConfig.socks_sniffing && (<>
                                <Divider/>
                                <Stack spacing={2} sx={{p: 2}}>
                                    <Typography variant="body1">探测类型</Typography>
                                    <Stack direction="row" spacing={1} sx={{justifyContent: "flex-start", alignItems: "center"}}>
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={destOverride.includes("http")}
                                                onChange={() => handleDestOverride("http")}/>}
                                            label="HTTP"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={destOverride.includes("tls")}
                                                onChange={() => handleDestOverride("tls")}/>}
                                            label="TLS"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={destOverride.includes("quic")}
                                                onChange={() => handleDestOverride("quic")}/>}
                                            label="QUIC"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={destOverride.includes("fakedns")}
                                                onChange={() => handleDestOverride("fakedns")}/>}
                                            label="FakeDNS"
                                        />
                                        <FormControlLabel
                                            control={<Checkbox
                                                checked={destOverride.includes("fakedns+others")}
                                                onChange={() => handleDestOverride("fakedns+others")}/>}
                                            label="FakeDNS+Others"
                                        />
                                    </Stack>
                                </Stack>
                            </>)}
                        </>)}

                        <Divider/>
                        <div className="flex-between p1">
                            <div className="flex-center-gap1">
                                <Typography variant="body1" sx={{pl: 1}}>Mux 协议</Typography>
                                <Tooltip arrow title="开启后，网页浏览加速，但视频和下载速度可能变慢" placement="right">
                                    <HelpIcon fontSize="small" sx={{color: 'text.secondary'}}/>
                                </Tooltip>
                            </div>
                            <Switch checked={rayCommonConfig.outbounds_mux} onChange={e => handleRayOutboundsMux(e.target.checked)}/>
                        </div>
                        {rayCommonConfig.outbounds_mux && (<>
                            <Divider/>
                            <Stack sx={{p: 2}}>
                                <Typography variant="body2">并发数</Typography>
                                <Box sx={{p: '15px 10px 0'}}>
                                    <Slider value={rayCommonConfig.outbounds_concurrency}
                                            onChange={(_, value) => handleRayOutboundsConcurrency(value)}
                                            min={1} max={128} aria-label="Concurrency" valueLabelDisplay="auto"/>
                                </Box>
                            </Stack>
                        </>)}
                    </Card>
                ) : activeTab === 3 && (
                    <Card sx={wSx}>
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
                )}
            </Box>
        </Paper>
    )
}

export default Setting
