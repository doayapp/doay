import { useState, useEffect, useRef, CSSProperties } from 'react'
import {
    Button, Box, Card, Dialog, DialogActions, Slider, Paper, Stack, InputAdornment,
    Alert, TextField, Typography, IconButton, useTheme, Chip, CircularProgress, Tooltip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import RestartAltIcon from '@mui/icons-material/RestartAlt'

import { readOpenLog, readRefusedLog, readTimeoutLog, startScanPorts } from "../util/invoke.ts"
import { formatDuration, formatSecond } from "../util/util.ts"

export const ScanPorts = () => {
    const [host, setHost] = useState('127.0.0.1')
    const [startPort, setStartPort] = useState(1)
    const [endPort, setEndPort] = useState(2048)
    const [maxThreads, setMaxThreads] = useState(50)
    const [timeoutMs, setTimeoutMs] = useState(300)

    const [scanning, setScanning] = useState(false)
    const [scanEnd, setScanEnd] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<any>({})

    const handleReset = () => {
        setHost('127.0.0.1')
        setStartPort(1)
        setEndPort(2048)
        setMaxThreads(50)
        setTimeoutMs(300)
        setScanning(false)
        setScanEnd(false)
        setError('')
        setResult({})
    }

    // ==================================== Change ====================================
    const handleStartPortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = Number(e.target.value) || 0
        val = Math.max(1, Math.min(val, endPort))
        setStartPort(val)
    }

    const handleEndPortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = Number(e.target.value) || 0
        val = Math.min(65535, Math.max(val, startPort))
        setEndPort(val)
    }

    const handleClear = () => {
        setHost('')
    }

    // ==================================== Scan ====================================
    const handleScan = async () => {
        setScanning(true)
        setScanEnd(false)
        setOpenLog('')
        setRefusedLog('')
        setTimeoutLog('')
        setError('')
        setResult({})
        const res = await startScanPorts(host, startPort, endPort, maxThreads, timeoutMs)
        if (res?.ok) {
            setResult(res)
        } else {
            setError(res?.error_message || '扫描失败')
        }
        setScanning(false)
        setScanEnd(true)
    }

    // ==================================== interval ====================================
    const openLogRef = useRef<HTMLTextAreaElement>(null)
    const refusedLogRef = useRef<HTMLTextAreaElement>(null)
    const timeoutLogRef = useRef<HTMLTextAreaElement>(null)

    const [openLog, setOpenLog] = useState('')
    const [refusedLog, setRefusedLog] = useState('')
    const [timeoutLog, setTimeoutLog] = useState('')

    const intervalRef = useRef<number>(0)
    useEffect(() => {
        const readLogs = async () => {
            setOpenLog(await readOpenLog())
            setTimeout(() => {
                if (openLogRef.current) openLogRef.current.scrollTop = openLogRef.current.scrollHeight
            }, 100)

            setRefusedLog(await readRefusedLog())
            setTimeout(() => {
                if (refusedLogRef.current) refusedLogRef.current.scrollTop = refusedLogRef.current.scrollHeight
            }, 100)

            setTimeoutLog(await readTimeoutLog())
            setTimeout(() => {
                if (timeoutLogRef.current) timeoutLogRef.current.scrollTop = timeoutLogRef.current.scrollHeight
            }, 100)
        }

        if (scanning && !scanEnd) {
            intervalRef.current = setInterval(readLogs, 1000)
        }

        return () => {
            clearInterval(intervalRef.current)
            setTimeout(readLogs, 200)
        }
    }, [scanning, scanEnd])

    // ==================================== textarea ====================================
    const theme = useTheme()
    const textareaStyle: CSSProperties = {
        width: '100%',
        height: 'calc(100vh - 305px)',
        padding: '8px',
        resize: 'none',
        display: 'block',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '0 0 4px 4px',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.secondary,
        fontFamily: 'inherit',
        fontSize: '1rem',
    }

    // ==================================== Dialog ====================================
    const [open, setOpen] = useState(false)
    const handleClose = () => {
        setOpen(false)
    }

    const pSx = {p: 1, px: 1.5, mb: '1px', borderRadius: '8px 8px 0 0'}
    return (<>
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <Stack spacing={3} sx={{px: 4, pt: 2}}>
                <Typography variant="h6" gutterBottom>高级设置</Typography>
                <Box>
                    <Typography variant="body2">最大线程: {maxThreads}</Typography>
                    <Slider
                        min={1} max={5000} step={1}
                        value={maxThreads}
                        onChange={(_, val) => setMaxThreads(Number(val))}
                        valueLabelDisplay="auto"
                    />
                </Box>
                <Box>
                    <Typography variant="body2">超时时间: {formatSecond(timeoutMs)}</Typography>
                    <Slider
                        min={100} max={10000} step={100}
                        value={timeoutMs}
                        onChange={(_, val) => setTimeoutMs(Number(val))}
                        valueLabelDisplay="auto"
                    />
                </Box>
            </Stack>
            <DialogActions sx={{p: 3, pt: 2}}>
                <Button variant="contained" onClick={handleClose}>确定</Button>
            </DialogActions>
        </Dialog>

        <Stack spacing={3} sx={{pt: 1}}>
            <TextField
                fullWidth
                size="small"
                label="目标 IP / 域名"
                value={host}
                onChange={e => setHost(e.target.value)}
                slotProps={{
                    input: {
                        endAdornment: host && (
                            <InputAdornment position="end"><IconButton onClick={handleClear} size="small"><CloseIcon/></IconButton></InputAdornment>
                        ),
                    },
                }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        size="small"
                        label="起始端口"
                        value={startPort}
                        onChange={handleStartPortChange}
                        sx={{width: 100}}
                    />
                    <TextField
                        size="small"
                        label="结束端口"
                        value={endPort}
                        onChange={handleEndPortChange}
                        sx={{width: 100}}
                    />
                    <div>
                        <Tooltip arrow placement="top" title="高级">
                            <IconButton size="small" aria-label="settings" onClick={() => setOpen(true)}><SettingsIcon/></IconButton>
                        </Tooltip>
                        <Tooltip arrow placement="top" title="重置">
                            <IconButton size="small" aria-label="reset" onClick={handleReset}><RestartAltIcon/></IconButton>
                        </Tooltip>
                    </div>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    {scanEnd && <Chip size="small" variant="outlined" color="info" label={`扫描耗时: ${formatDuration(result?.elapsed_secs || 0)}`}/>}
                    <Button variant="contained" disabled={scanning || !host} onClick={handleScan}>{scanning ? <CircularProgress size={20}/> : '开始扫描'}</Button>
                </Stack>
            </Stack>

            {error ? (
                <Alert severity="error" variant="outlined">{error}</Alert>
            ) : (scanning || scanEnd) && (
                <Stack direction="row" spacing={1}>
                    <Card elevation={3} sx={{flex: 1}}>
                        <Paper elevation={2} sx={pSx}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                开放端口
                                {scanEnd && <Chip size="small" variant="outlined" color="info" label={`端口数: ${result?.open_count || 0}`}/>}
                            </Stack>
                        </Paper>
                        <textarea readOnly className="scr-w2" style={textareaStyle} ref={openLogRef} value={openLog.trim()}/>
                    </Card>
                    <Card elevation={3} sx={{flex: 1}}>
                        <Paper elevation={2} sx={pSx}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                拒连端口
                                {scanEnd && <Chip size="small" variant="outlined" color="info" label={`端口数: ${result?.refused_count || 0}`}/>}
                            </Stack>
                        </Paper>
                        <textarea readOnly className="scr-w2" style={textareaStyle} ref={refusedLogRef} value={refusedLog.trim()}/>
                    </Card>
                    <Card elevation={3} sx={{flex: 1}}>
                        <Paper elevation={2} sx={pSx}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                超时端口
                                {scanEnd && <Chip size="small" variant="outlined" color="info" label={`端口数: ${result?.timeout_count || 0}`}/>}
                            </Stack>
                        </Paper>
                        <textarea readOnly className="scr-w2" style={textareaStyle} ref={timeoutLogRef} value={timeoutLog.trim()}/>
                    </Card>
                </Stack>
            )}
        </Stack>
    </>)
}

export default ScanPorts
