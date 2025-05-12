import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'

import {
    styled, CssBaseline, GlobalStyles,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Paper, Tooltip, Stack, Box, Fab
} from '@mui/material'

import {
    Home as HomeIcon,
    Storage as StorageIcon,
    Inbox as InboxIcon,
    Rule as RuleIcon,
    Assignment as AssignmentIcon,
    Handyman as HandymanIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon
} from '@mui/icons-material'

import { ThemeProvider } from './context/ThemeProvider.tsx'

import Home from "./view/Home.tsx"
import Server from "./view/Server.tsx"
import ServerCreate from "./view/ServerCreate.tsx"
import ServerExport from "./view/ServerExport.tsx"
import ServerImport from "./view/ServerImport.tsx"
import ServerUpdate from "./view/ServerUpdate.tsx"
import Subscription from "./view/Subscription.tsx"
import Rule from "./view/Rule.tsx"
import Log from "./view/Log.tsx"
import LogDetail from "./view/LogDetail.tsx"
import Tool from "./view/Tool.tsx"
import Setting from "./view/Setting.tsx"

// const ServerImport = lazy(() => import("./view/ServerImport.tsx"))
// const Tool = lazy(() => import("./view/Tool.tsx"))

import './App.css'
import { appElapsed, isQuietMode, readSubscriptionList, safeInvoke } from "./util/invoke.ts"
import { getSubscription } from "./util/subscription.ts"
import { useDebounce } from "./hook/useDebounce.ts"
import { useVisibility } from "./hook/useVisibility.ts"
import { useWindowFocused } from "./hook/useWindowFocused.ts"
import { useNoBackspaceNav } from "./hook/useNoBackspaceNav.ts"
import { hideWindow, showWindow } from "./util/tauri.ts"

let subscribeLastUpdate = 0

const App: React.FC = () => {
    useNoBackspaceNav()

    const navItems = [
        {path: '/', text: '首页', icon: <HomeIcon/>},
        {path: '/server', text: '服务器', icon: <StorageIcon/>},
        {path: '/subscription', text: '订阅', icon: <InboxIcon/>},
        {path: '/rule', text: '规则', icon: <RuleIcon/>},
        {path: '/log', text: '日志', icon: <AssignmentIcon/>},
        {path: '/tool', text: '工具', icon: <HandymanIcon/>},
        {path: '/setting', text: '设置', icon: <SettingsIcon/>}
    ]

    const isElapsed = useRef(false)
    useEffect(() => {
        setTimeout(async () => {
            if (isElapsed.current) return
            isElapsed.current = true

            await appElapsed()
            let isQuiet = await isQuietMode()
            if (!isQuiet) await showWindow()
        }, 0)
    }, [])

    const isVisibility = useVisibility()
    const isWindowFocused = useWindowFocused()
    useEffect(() => {
        if (isVisibility) setTimeout(subscribeUpdate, 0)
        if (!isVisibility && !isWindowFocused) setTimeout(hideWindow, 0)
    }, [isVisibility, isWindowFocused])

    const subscribeUpdate = useDebounce(async () => {
        if (Date.now() - subscribeLastUpdate < 1000 * 60 * 10) return // 更新频率，不要超过 10 分钟

        const subList = await readSubscriptionList() as SubscriptionList
        if (subList) {
            for (const row of subList) {
                if (row.autoUpdate) {
                    await getSubscription(row)
                }
            }
        }
        subscribeLastUpdate = Date.now()
    }, 2000)

    // ====================== nav ======================
    const [navState, setNavState] = useState(-1)
    const handleNavClick = (index: number) => {
        setNavState(index)
    }

    const CustomListItemIcon = styled(ListItemIcon)(() => ({minWidth: 36}))

    return (
        <ThemeProvider>
            <GlobalStyles styles={{body: {userSelect: 'none'}}}/>
            <CssBaseline/>
            <Router>
                <Box sx={{position: 'fixed', left: 0, bottom: 15, width: 130, zIndex: 1}}>
                    <Stack spacing={0} sx={{justifyContent: "center", alignItems: "center"}}>
                        <Tooltip arrow title="退出程序">
                            <Fab color="error" size="medium" aria-label="logout" onClick={() => safeInvoke('quit')}>
                                <LogoutIcon/>
                            </Fab>
                        </Tooltip>
                    </Stack>
                </Box>
                <div className="panel-left">
                    <Paper elevation={5} sx={{width: '100%', height: '100%', borderRadius: 0}}>
                        <List>
                            {navItems.map((item, index) => (
                                <ListItem disablePadding key={index}>
                                    <ListItemButton
                                        component={Link}
                                        to={item.path}
                                        selected={navState === index}
                                        onClick={() => handleNavClick(index)}
                                    >
                                        <CustomListItemIcon>{item.icon}</CustomListItemIcon>
                                        <ListItemText primary={item.text}/>
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </div>
                <div className="panel-right">
                    <Routes>
                        <Route path="/" element={<Home setNavState={setNavState}/>}/>
                        <Route path="/server" element={<Server setNavState={setNavState}/>}/>
                        <Route path="/server_create" element={<ServerCreate setNavState={setNavState}/>}/>
                        <Route path="/server_import" element={<ServerImport setNavState={setNavState}/>}/>
                        <Route path="/server_export" element={<ServerExport setNavState={setNavState}/>}/>
                        <Route path="/server_update" element={<ServerUpdate setNavState={setNavState}/>}/>
                        <Route path="/subscription" element={<Subscription setNavState={setNavState}/>}/>
                        <Route path="/rule" element={<Rule setNavState={setNavState}/>}/>
                        <Route path="/log" element={<Log setNavState={setNavState}/>}/>
                        <Route path="/log_detail" element={<LogDetail setNavState={setNavState}/>}/>
                        <Route path="/tool" element={<Tool setNavState={setNavState}/>}/>
                        <Route path="/setting" element={<Setting setNavState={setNavState}/>}/>
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    )
}

export default App
