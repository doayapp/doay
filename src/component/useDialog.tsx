import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

export function useDialog() {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [onConfirm, setOnConfirm] = useState<() => void>()

    const dialogConfirm = (title: string, content: string, onConfirm: () => void) => {
        setTitle(title)
        setContent(content)
        setOnConfirm(() => onConfirm)
        setOpen(true)
    }

    const handleClose = () => {
        setOpen(false)
    }

    const handleConfirm = () => {
        onConfirm && onConfirm()
        handleClose()
    }

    const DialogComponent = () => (
        <Dialog open={open} onClose={handleClose} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">{content}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleConfirm}>确认</Button>
                <Button onClick={handleClose} autoFocus>取消</Button>
            </DialogActions>
        </Dialog>
    )

    return {DialogComponent, dialogConfirm}
}
