import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Box, Card, TextField, Button, Stack, Dialog, DialogContent, DialogActions } from '@mui/material'
import { useDebounce } from '../hook/useDebounce.ts'
import { useSnackbar } from "../component/useSnackbar.tsx"
import { PageHeader } from "../component/PageHeader.tsx"
import { useServerImport } from "../component/useServerImport.tsx"
import { clipboardReadImage } from "../util/tauri.ts"

const ServerImport: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(1), [setNavState])
    const navigate = useNavigate()

    // =============== text import ===============
    const [text, setText] = useState('')
    const [error, setError] = useState(false)
    const handleTextChange = (value: string) => {
        setError(false)
        setText(value)
    }
    const handleSubmit = useDebounce(async () => {
        await useServerImport(text, showSnackbar, setError, () => {
            setTimeout(() => navigate('/server'), 1000)
        })
    }, 300)

    // =============== file import ===============
    const fileInputRef = useRef<HTMLInputElement>(null)
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(false)
        const files = event.target.files
        if (!files || files.length < 1) return

        let ok = 0
        let err = 0
        let s = ''
        for (const file of files) {
            if (!file.type.startsWith('image/')) return
            try {
                const html5Qr = new Html5Qrcode("hidden-reader")
                const decodedText = await html5Qr.scanFile(file, true)
                s += decodedText + '\n'
                ok++
            } catch {
                err++
            }
        }

        setText(s)
        if (err > 0) showSnackbar(`识别失败 ${err} 张, 成功 ${ok} 张`, 'warning')
        event.target.value = ''
    }

    // =============== clipboard import ===============
    const handleReadClipboard = async () => {
        try {
            const image = await clipboardReadImage()
            const imgRgba = await image.rgba()
            const imgSize = await image.size()
            const file = await createImageFromRGBA(imgRgba, imgSize.width, imgSize.height)
            if (!file) {
                showSnackbar('转 canvas 出错', 'error')
                return
            }

            try {
                const html5Qr = new Html5Qrcode("hidden-reader")
                const r = await html5Qr.scanFile(file, true)
                setText(r)
            } catch {
                showSnackbar('没有识别到内容', 'error')
            }
        } catch {
            showSnackbar('没有从剪切板读取到内容', 'error')
        }
    }

    const createImageFromRGBA = (rgbaData: Uint8Array, width: number, height: number): Promise<File | null> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(null)

            canvas.width = width
            canvas.height = height
            const imageData = new ImageData(new Uint8ClampedArray(rgbaData), width, height)
            ctx.putImageData(imageData, 0, 0)

            canvas.toBlob((blob) => {
                if (!blob) return resolve(null)

                const file = new File([blob], 'clipboard.png', {type: 'image/png'})
                resolve(file)
            }, 'image/png')
        })
    }

    // =============== camera import ===============
    const [open, setOpen] = useState(false)
    const [cameraState, setCameraState] = useState(-1)
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const handleStopCamera = async () => {
        setOpen(false)
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop()
                scannerRef.current.clear()
            } catch (e) {
            }
        }
    }

    const handleStartCamera = async () => {
        setOpen(true)
        setCameraState(-1)
        try {
            const devices = await Html5Qrcode.getCameras()
            if (!devices || devices.length < 1) {
                setCameraState(0)
                return
            }

            setCameraState(1)
            setTimeout(() => startCamera(devices[0].id), 200)
        } catch (e) {
            setCameraState(0)
            return
        }
    }

    const startCamera = async (cameraId: string) => {
        try {
            const qrScanner = new Html5Qrcode('camera-reader')
            scannerRef.current = qrScanner
            await qrScanner.start(
                cameraId,
                {fps: 10, qrbox: 250},
                (decodedText) => {
                    setText(decodedText)
                    handleStopCamera()
                },
                (_) => {
                }
            )
        } catch {
            setCameraState(-2)
        }
    }

    const {SnackbarComponent, showSnackbar, handleCloseSnackbar} = useSnackbar()
    return (<>
        <SnackbarComponent/>
        <div id="hidden-reader" style={{display: 'none'}}></div>
        <Dialog open={open} onClose={handleStopCamera}>
            <DialogContent sx={{p: 2, pb: 0}}>
                {cameraState === -1 ? (
                    <div className="camera-box">正在检测摄像头</div>
                ) : cameraState === 0 ? (
                    <div className="camera-box">未检测到摄像头，请检查设备或权限</div>
                ) : cameraState === 1 ? (
                    <div id="camera-reader" style={{width: 480, height: 360}}/>
                ) : cameraState === -2 && (
                    <div className="camera-box">启用摄像头失败</div>
                )}
            </DialogContent>
            <DialogActions sx={{px: 2, py: 1}}>
                <Button variant="contained" onClick={handleStopCamera}>取消</Button>
            </DialogActions>
        </Dialog>
        <Card>
            <PageHeader title="导入" backLink="/server"/>
            <Box sx={{p: 2}}>
                <Stack direction="row" spacing={1} sx={{alignItems: 'center', mb: 2.5}}>
                    <Button variant="contained" color="secondary" className="qr-upload-but">
                        <input multiple type="file" accept="image/*" ref={fileInputRef} onClick={handleCloseSnackbar} onChange={handleFileChange}/>
                        选择二维码图片
                    </Button>
                    <Button variant="contained" color="success" onClick={handleReadClipboard}>从剪切板提取二维码</Button>
                    <Button variant="contained" color="warning" onClick={handleStartCamera}>摄像头扫描二维码</Button>
                </Stack>
                <TextField fullWidth multiline variant="outlined" label="请输入链接(URI)" minRows={6} maxRows={20} value={text}
                           placeholder="每行一条，例如：vless://xxxxxx 或 ss://xxxxxx" autoFocus={true} error={error}
                           onChange={(e) => handleTextChange(e.target.value)}/>
                <Stack direction="row" spacing={1} sx={{mt: 2}}>
                    <Button variant="contained" onClick={handleSubmit} disabled={!text}>确定</Button>
                </Stack>
            </Box>
        </Card>
    </>)
}

export default ServerImport
