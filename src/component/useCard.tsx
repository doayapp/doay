import { Card, CircularProgress } from '@mui/material'
import FmdBadIcon from '@mui/icons-material/FmdBad'

const centerSx = {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 20px)',
    mt: 0,
    textAlign: 'center'
}

export const ErrorCard = ({errorMsg, height, elevation, mt}: {
    errorMsg: string
    height?: string
    elevation?: number
    mt?: number
}) => {
    let sx = {...centerSx, ...(height ? {height} : {}), ...(mt ? {mt} : {})}
    return (
        <Card elevation={elevation ?? 2} sx={sx}>
            <FmdBadIcon sx={{fontSize: '5rem', mb: 2}}/>
            <div>{errorMsg}</div>
        </Card>
    )
}

export const LoadingCard = ({height, elevation, mt}: { height?: string, elevation?: number, mt?: number }) => {
    let sx = {...centerSx, ...(height ? {height} : {}), ...(mt ? {mt} : {})}
    return (
        <Card elevation={elevation ?? 2} sx={sx}>
            <CircularProgress/>
        </Card>
    )
}
