import { Stack, Typography } from '@mui/material'
import { GaugeContainer, GaugeValueArc, GaugeReferenceArc, useGaugeState } from '@mui/x-charts/Gauge'

function GaugePointer() {
    const {valueAngle, outerRadius, cx, cy} = useGaugeState()
    if (valueAngle === null) return null

    const target = {
        x: cx + outerRadius * Math.sin(valueAngle),
        y: cy - outerRadius * Math.cos(valueAngle),
    }
    return (<g>
        <circle cx={cx} cy={cy} r={5} fill="red"/>
        <path d={`M ${cx} ${cy} L ${target.x} ${target.y}`} stroke="red" strokeWidth={3}/>
    </g>)
}

export const SpeedGauge = ({percent, value}: { percent: number, value: string }) => {
    return (
        <Stack sx={{flex: 1, alignItems: 'center'}}>
            <GaugeContainer width={320} height={180} startAngle={-110} endAngle={110} value={percent}>
                <GaugeReferenceArc/>
                <GaugeValueArc/>
                <GaugePointer/>
            </GaugeContainer>
            <Typography variant="body1">{value}</Typography>
        </Stack>
    )
}
