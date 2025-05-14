import { useState, useEffect, FC } from 'react'
import { Paper, Box, Tabs, Tab } from '@mui/material'

import SettingBase from "./SettingBase.tsx"
import SettingProxy from "./SettingProxy.tsx"
import SettingRay from "./SettingRay.tsx"
import SettingWeb from "./SettingWeb.tsx"

const Setting: FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(6), [setNavState])

    const [activeTab, setActiveTab] = useState(0)

    return (
        <Paper elevation={3} sx={{borderRadius: 2, height: 'calc(100vh - 20px)', overflow: 'visible'}}>
            <Paper elevation={1} sx={{display: 'flex', justifyContent: 'center', borderRadius: '8px 8px 0 0'}}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} aria-label="设置导航">
                    <Tab label="基本设置"/>
                    <Tab label="代理设置"/>
                    <Tab label="Ray 设置"/>
                    <Tab label="Web 设置"/>
                </Tabs>
            </Paper>

            <Box className="scr-none" sx={{p: 2, height: 'calc(100% - 48px)', overflow: 'auto'}}>
                <Box sx={{m: '0 auto', maxWidth: 660}}>
                    {activeTab === 0 ? (
                        <SettingBase/>
                    ) : activeTab === 1 ? (
                        <SettingProxy/>
                    ) : activeTab === 2 ? (
                        <SettingRay/>
                    ) : activeTab === 3 && (
                        <SettingWeb/>
                    )}
                </Box>
            </Box>
        </Paper>
    )
}

export default Setting
