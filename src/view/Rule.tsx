import { useState, useEffect, useRef } from 'react'
import {
    Paper, Card, TextField, ToggleButtonGroup, ToggleButton, Drawer,
    Stack, Button, Alert, Typography, Switch,
    BottomNavigation, BottomNavigationAction
} from '@mui/material'
import RouteIcon from '@mui/icons-material/Route'
import DnsIcon from '@mui/icons-material/Dns'
import SendIcon from '@mui/icons-material/Send'
import FlightIcon from '@mui/icons-material/Flight'
import BlockIcon from '@mui/icons-material/Block'
import SettingsIcon from '@mui/icons-material/Settings'

import { LoadingCard } from "../component/useCard.tsx"
import { useChip } from "../component/useChip.tsx"
import { RuleAdvanced } from './RuleAdvanced.tsx'
import { Dns } from './Dns.tsx'
import { readAppConfig, readRuleConfig, readRuleDomain, readRuleModeList, saveRuleConfig, saveRuleDomain, setAppConfig } from "../util/invoke.ts"
import { useDebounce } from "../hook/useDebounce.ts"
import { DEFAULT_RULE_CONFIG, DEFAULT_RULE_DOMAIN, DEFAULT_RULE_MODE_LIST } from "../util/config.ts"
import { processDomain } from "../util/util.ts"
import { updateProxyPAC } from "../util/proxy.ts"
import { saveRayRule } from "../util/ray.ts"

const Rule: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(3), [setNavState])

    const [loading, setLoading] = useState(true)
    const [ruleMode, setRuleMode] = useState('route')
    const [ruleType, setRuleType] = useState(0)
    const [ruleConfig, setRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG)
    const [ruleDomain, setRuleDomain] = useState<RuleDomain>(DEFAULT_RULE_DOMAIN)
    const loadConfig = useDebounce(async () => {
        const newRuleConfig = await readRuleConfig() as RuleConfig
        if (newRuleConfig) setRuleConfig({...DEFAULT_RULE_CONFIG, ...newRuleConfig})

        const newRuleDomain = await readRuleDomain() as RuleDomain
        if (newRuleDomain) setRuleDomain({...DEFAULT_RULE_DOMAIN, ...newRuleDomain})
        setLoading(false)
    }, 100)
    useEffect(loadConfig, [])

    const handleGlobalProxy = (checked: boolean) => {
        setRuleConfig(prev => {
            const newRuleConfig = {...prev, globalProxy: checked}
            updateRayConfig(newRuleConfig, ruleDomain).catch(_ => 0)
            saveRuleConfig(newRuleConfig).catch(_ => 0)
            setGlobalProxyByAppConfig(checked).catch(_ => 0)
            return newRuleConfig
        })
    }

    const setGlobalProxyByAppConfig = async (isChange: boolean) => {
        if (!isChange) return
        const config = await readAppConfig() as AppConfig
        if (config) {
            // 防止用户误操作，修改为最保险的配置
            setTimeout(() => setAppConfig('set_auto_setup_pac', false), 0)
            setTimeout(() => setAppConfig('set_auto_setup_socks', true), 200)
            setTimeout(() => setAppConfig('set_auto_setup_http', false), 300)
            setTimeout(() => setAppConfig('set_auto_setup_https', false), 600)
        }
    }

    const handleDomainChange = (type: keyof RuleDomain) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRuleDomain(prev => ({...prev, [type]: e.target.value}))
    }

    const handleSaveRuleDomain = useDebounce(async () => {
        const newRuleDomain = {
            proxy: processDomain(ruleDomain.proxy, true),
            direct: processDomain(ruleDomain.direct, true),
            reject: processDomain(ruleDomain.reject, true),
        }
        setRuleDomain(newRuleDomain)
        const ok = await saveRuleDomain(newRuleDomain)
        if (!ok) {
            showChip('保存失败', 'error')
            return
        }

        await updateRayConfig(ruleConfig, newRuleDomain)
        await updateProxyPAC(ruleConfig, newRuleDomain)
        showChip('设置成功', 'success')
    }, 50)

    let ruleModeList = useRef<RuleModeList | null>(null)
    const updateRayConfig = async (ruleConfig: RuleConfig, ruleDomain: RuleDomain) => {
        if (!ruleModeList.current) ruleModeList.current = await readRuleModeList() || DEFAULT_RULE_MODE_LIST
        await saveRayRule(ruleConfig, ruleDomain, ruleModeList.current)
    }

    // ============================== advanced ==============================
    const [open, setOpen] = useState(false)
    const handleOpenAdvanced = () => {
        setOpen(true)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const {ChipComponent, showChip} = useChip()
    return loading ? (
        <LoadingCard/>
    ) : (<>
        <Paper elevation={5} sx={{p: 1, borderRadius: 2, height: 'calc(100vh - 20px)', overflow: 'visible'}}>
            <div className="flex-center p1">
                <ToggleButtonGroup exclusive value={ruleMode} onChange={(_, v) => v && setRuleMode(v)}>
                    <ToggleButton value="route"><RouteIcon sx={{mr: 1}}/>访问规则</ToggleButton>
                    <ToggleButton value="dns"><DnsIcon sx={{mr: 1}}/>DNS 规则</ToggleButton>
                </ToggleButtonGroup>
            </div>
            <Card sx={{p: 2, maxWidth: '800px', maxHeight: 'calc(100% - 56px)', m: 'auto', overflow: 'auto'}}>
                {ruleMode === 'route' && (
                    <div className="flex-column gap2">
                        <div className="flex-between">
                            <Typography variant="body1" sx={{pl: 1}}>全局代理</Typography>
                            <Switch checked={ruleConfig.globalProxy} onChange={(_, checked) => handleGlobalProxy(checked)}/>
                        </div>
                        {!ruleConfig.globalProxy && (<>
                            <BottomNavigation
                                sx={{mb: 2}}
                                showLabels
                                component={Paper}
                                elevation={5}
                                value={ruleType}
                                onChange={(_, v) => setRuleType(v)}>
                                <BottomNavigationAction label="代理" icon={<SendIcon/>}/>
                                <BottomNavigationAction label="直连" icon={<FlightIcon/>}/>
                                <BottomNavigationAction label="阻止" icon={<BlockIcon/>}/>
                            </BottomNavigation>

                            {ruleType === 0 ? (<>
                                <Alert variant="filled" severity="warning">
                                    通过第三方服务器访问网络，适合访问国外网站或需要隐藏真实 IP 的场景。
                                </Alert>
                                <TextField
                                    variant="outlined" fullWidth multiline rows={6}
                                    label="请填写域名(每行一条)"
                                    value={ruleDomain.proxy}
                                    onChange={handleDomainChange('proxy')}
                                    placeholder="例如：google.com"/>
                            </>) : ruleType === 1 ? (<>
                                <Alert variant="filled" severity="success">
                                    直接连接网络，不经过任何代理服务器，适合访问国内网站。
                                </Alert>
                                <TextField
                                    variant="outlined" fullWidth multiline rows={6}
                                    label="请填写域名(每行一条)"
                                    value={ruleDomain.direct}
                                    onChange={handleDomainChange('direct')}
                                    placeholder="例如：baidu.com"/>
                            </>) : ruleType === 2 && (<>
                                <Alert variant="filled" severity="error">
                                    阻止访问某些网站或服务，适合屏蔽广告、恶意网站或不希望访问的内容。
                                </Alert>
                                <TextField
                                    variant="outlined" fullWidth multiline rows={6}
                                    label="请填写域名(每行一条)"
                                    value={ruleDomain.reject}
                                    onChange={handleDomainChange('reject')}
                                    placeholder="例如：fakebanklogin.com"/>
                            </>)}

                            <div className="flex-between">
                                <Stack direction="row" spacing={2} sx={{justifyContent: "flex-start", alignItems: "center"}}>
                                    <Button variant="contained" color="info" onClick={handleSaveRuleDomain}>确定</Button>
                                    <ChipComponent/>
                                </Stack>
                                <Button variant="contained" onClick={handleOpenAdvanced} startIcon={<SettingsIcon/>}>高级</Button>
                            </div>
                        </>)}
                    </div>
                )}

                {ruleMode === 'dns' && <Dns/>}
            </Card>
        </Paper>

        <Drawer anchor="right" open={open} onClose={handleClose}>
            <RuleAdvanced handleClose={handleClose} ruleConfig={ruleConfig} setRuleConfig={setRuleConfig} ruleDomain={ruleDomain}/>
        </Drawer>
    </>)
}

export default Rule
