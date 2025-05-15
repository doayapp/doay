import React, { useState, useEffect } from 'react'
import { Paper, Stack, ToggleButtonGroup, ToggleButton } from '@mui/material'
import GridViewIcon from '@mui/icons-material/GridView'
import InsightsIcon from '@mui/icons-material/Insights'

import HomeBase from "./HomeBase.tsx"
import HomeRay from "./HomeRay.tsx"

const Home: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(0), [setNavState])

    const [homeType, setHomeType] = useState('base')

    // const pSx = {p: 2, borderRadius: 2, width: '100%', height: `calc(100vh - 20px)`, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center'}
    const pSx = {p: 2, borderRadius: 2, width: '100%', height: `calc(100vh - 20px)`, overflow: 'auto'}

    return (<>
        <Paper className="scr-none" elevation={5} sx={pSx}>
            <div className="flex-center p1">
                <ToggleButtonGroup exclusive value={homeType} onChange={(_, v) => v && setHomeType(v)}>
                    <ToggleButton value="base"><GridViewIcon sx={{mr: 1}}/>基本信息</ToggleButton>
                    <ToggleButton value="ray"><InsightsIcon sx={{mr: 1}}/>Xray 信息</ToggleButton>
                </ToggleButtonGroup>
            </div>

            <Stack spacing={2} sx={{width: 620, m: 'auto'}}>
                {homeType === 'base' ? (
                    <HomeBase/>
                ) : homeType === 'ray' && (
                    <HomeRay/>
                )}
            </Stack>
        </Paper>
    </>)
}

export default Home
