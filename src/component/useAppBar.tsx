import { useNavigate } from 'react-router-dom'
import { AppBar, Typography, Button } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

export const useAppBar = (backUrl: string, title: string) => {
    const navigate = useNavigate()
    const AppBarComponent = () => (
        <AppBar position="static" sx={{p: 1, pl: 2, display: 'flex', flexDirection: 'row', justifyContent: "flex-start", alignItems: "center"}}>
            <Button variant="text" color="warning"
                    sx={{p: 1, mr: 2, minWidth: 0, borderRadius: '50%', '&:hover': {bgColor: 'action.hover'}}}
                    onClick={() => navigate(backUrl || '/')}>
                <ArrowBackIosNewIcon fontSize="small"/>
            </Button>
            <Typography variant="body1">{title}</Typography>
        </AppBar>
    )
    return {AppBarComponent}
}
