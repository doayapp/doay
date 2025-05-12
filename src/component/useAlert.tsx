import { useState } from 'react'
import { Alert, Collapse } from '@mui/material'

export const useAlert = () => {
    const [open, setOpen] = useState(false)
    const [msg, setMsg] = useState('')
    const [severity, setSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info')

    const showAlert = (msg: string, severity?: 'success' | 'info' | 'warning' | 'error') => {
        setMsg(msg)
        setSeverity(severity || 'info')
        setOpen(true)
    }

    const AlertComponent = () => (
        <Collapse in={open}>
            <Alert sx={{mt: 2, maxWidth: 600}} variant="filled" severity={severity} onClose={() => setOpen(false)}>{msg}</Alert>
        </Collapse>
    )

    return {AlertComponent, showAlert}
}
