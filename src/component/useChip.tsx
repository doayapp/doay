import { useState, useEffect } from 'react'
import { Collapse, Chip } from '@mui/material'

export const useChip = () => {
    const [open, setOpen] = useState(false)
    const [msg, setMsg] = useState('')
    const [color, setColor] = useState<'success' | 'info' | 'warning' | 'error'>('success')
    const [timer, setTimer] = useState(-1)

    const showChip = (msg: string, color?: 'success' | 'info' | 'warning' | 'error', duration?: number) => {
        setOpen(true)
        setMsg(msg)
        setColor(color || 'success')
        const timer = setTimeout(() => setOpen(false), duration || 2000)
        setTimer(timer)
    }

    useEffect(() => {
        return () => clearTimeout(timer)
    }, [])

    const ChipComponent = () => (
        <Collapse in={open}>
            <Chip label={msg} color={color} size="small"/>
        </Collapse>
    )

    return {ChipComponent, showChip}
}
