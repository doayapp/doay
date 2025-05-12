import { useState, useEffect } from 'react'
import { Box, Card, Paper, ToggleButtonGroup, ToggleButton } from '@mui/material'
import TerminalIcon from '@mui/icons-material/Terminal'
import WysiwygIcon from '@mui/icons-material/Wysiwyg'
import HttpIcon from '@mui/icons-material/Http'
import SpeedIcon from '@mui/icons-material/Speed'
import RadarIcon from '@mui/icons-material/Radar'

import SysInfo from "./SysInfo.tsx"
import TerminalCmd from "./TerminalCmd.tsx"
import HttpTest from "./HttpTest.tsx"
import SpeedTest from "./SpeedTest.tsx"
import ScanPorts from "./ScanPorts.tsx"

const Tool: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(5), [setNavState])

    const [action, setAction] = useState('system')

    return (
        <Paper elevation={5} sx={{p: 1, borderRadius: 2, height: 'calc(100vh - 20px)'}}>
            <div className="flex-center p1">
                <ToggleButtonGroup exclusive value={action} onChange={(_, v) => v && setAction(v)}>
                    <ToggleButton value="system"><WysiwygIcon sx={{mr: 1}}/>系统信息</ToggleButton>
                    <ToggleButton value="term"><TerminalIcon sx={{mr: 1}}/>终端命令</ToggleButton>
                    <ToggleButton value="http"><HttpIcon sx={{mr: 1}}/>请求测试</ToggleButton>
                    <ToggleButton value="speed"><SpeedIcon sx={{mr: 1}}/>网速测试</ToggleButton>
                    <ToggleButton value="scan"><RadarIcon sx={{mr: 1}}/>端口扫描</ToggleButton>
                </ToggleButtonGroup>
            </div>

            <Box sx={{maxHeight: 'calc(100% - 56px)', overflow: 'auto'}}>
                <Card sx={{p: 2, maxWidth: '800px', m: 'auto'}}>
                    {action === 'system' && (<SysInfo/>)}
                    {action === 'term' && (<TerminalCmd/>)}
                    {action === 'http' && (<HttpTest/>)}
                    {action === 'speed' && (<SpeedTest/>)}
                    {action === 'scan' && (<ScanPorts/>)}
                </Card>
            </Box>
        </Paper>
    )
}

export default Tool
