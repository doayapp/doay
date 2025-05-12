import { useNavigate } from 'react-router-dom'
import { Stack, Paper, Button, Typography } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

export const PageHeader = ({title, backLink}: { title: string, backLink: string }) => {
    const navigate = useNavigate()
    return (
        <Stack direction="row" component={Paper} elevation={1} sx={{p: 1, borderRadius: '8px 8px 0 0', alignItems: 'center'}}>
            <Button
                variant="text"
                color="warning"
                sx={{p: 1, mr: 2, minWidth: 0, borderRadius: '50%', '&:hover': {backgroundColor: 'action.hover'}}}
                onClick={() => navigate(backLink)}
            >
                <ArrowBackIosNewIcon fontSize="small"/>
            </Button>
            <Typography variant="body1">{title}</Typography>
        </Stack>
    )
}
