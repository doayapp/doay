import { useState } from 'react'
import { Snackbar, Alert } from '@mui/material'

export const useSnackbar = (position?: 'br' | 'tr' | 'top') => {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [autoHideDuration, setAutoHideDuration] = useState<number>(3000)
    const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info')

    const handleClose = (_?: any, reason?: string) => {
        if (reason === 'clickaway') return
        setOpen(false)
    }

    const showSnackbar = (msg: string, severity?: 'success' | 'info' | 'warning' | 'error', duration?: number) => {
        setMessage(msg)
        setSeverity(severity || 'info')
        setAutoHideDuration(duration ?? 3000)
        setOpen(true)
    }

    const SnackbarComponent = () => (
        <Snackbar
            open={open}
            onClose={handleClose}
            autoHideDuration={autoHideDuration}
            anchorOrigin={
                position === 'tr' ? {vertical: 'top', horizontal: 'right'} :
                    position === 'br' ? {vertical: 'bottom', horizontal: 'right'} :
                        {vertical: 'top', horizontal: 'center'}
            }
            sx={{zIndex: 9999}}
        >
            <Alert variant="filled" severity={severity} onClose={handleClose}>{message}</Alert>
        </Snackbar>
    )

    return {SnackbarComponent, showSnackbar, handleCloseSnackbar: handleClose}
}
