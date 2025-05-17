import { useState, useRef } from 'react'
import { Snackbar, Alert } from '@mui/material'

type SnackbarPosition = 'bottom-right' | 'top-right' | 'top-center'

export const useSnackbar = () => {
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [autoHideDuration, setAutoHideDuration] = useState<number>(3000)
    const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info')
    const [position, setPosition] = useState<SnackbarPosition>('top-center')

    const lastMessageRef = useRef<string | null>(null)
    const timeoutRef = useRef<number | null>(null)

    const showSnackbar = (
        msg: string,
        severityLevel?: 'success' | 'info' | 'warning' | 'error',
        duration?: number,
        pos?: SnackbarPosition
    ) => {
        if (open && msg === lastMessageRef.current) return

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }

        timeoutRef.current = setTimeout(() => {
            setMessage(msg)
            setSeverity(severityLevel || 'info')
            setAutoHideDuration(duration ?? 3000)
            setPosition(pos || 'top-center')
            setOpen(true)
            lastMessageRef.current = msg
        }, 200)
    }

    const SnackbarComponent = () => {
        let anchorOrigin: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' }

        switch (position) {
            case 'top-right':
                anchorOrigin = {vertical: 'top', horizontal: 'right'}
                break
            case 'bottom-right':
                anchorOrigin = {vertical: 'bottom', horizontal: 'right'}
                break
            case 'top-center':
            default:
                anchorOrigin = {vertical: 'top', horizontal: 'center'}
                break
        }

        return (
            <Snackbar open={open} onClose={handleSnackbarClose} autoHideDuration={autoHideDuration} anchorOrigin={anchorOrigin} sx={{zIndex: 9999}}>
                <Alert variant="filled" severity={severity} onClose={handleSnackbarClose}>{message}</Alert>
            </Snackbar>
        )
    }

    const handleSnackbarClose = (_?: any, reason?: string) => {
        if (reason === 'clickaway') return
        setOpen(false)
    }

    return {SnackbarComponent, showSnackbar, handleSnackbarClose}
}
