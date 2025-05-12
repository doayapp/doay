import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
    Box, Card, Typography, TextField, ToggleButtonGroup, ToggleButton,
    Accordion, AccordionSummary, AccordionDetails, Stack, Button
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CollectionsIcon from '@mui/icons-material/Collections'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SaveAltIcon from '@mui/icons-material/SaveAlt'

import { PageHeader } from "../component/PageHeader.tsx"
import { useSnackbar } from "../component/useSnackbar.tsx"
import { ErrorCard, LoadingCard } from "../component/useCard.tsx"
import { readServerList, saveTextFile } from "../util/invoke.ts"
import { serverRowToBase64Uri, serverRowToUri } from "../util/server.ts"
import { getCurrentYMDHIS } from "../util/util.ts"
import { clipboardWriteImage, clipboardWriteText, createImage, showSaveDialog } from "../util/tauri.ts"
import { useDebounce } from "../hook/useDebounce.ts"

const ServerExport: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(1), [setNavState])

    const location = useLocation()
    const {selectedKeys} = location.state || []

    const [serverList, setServerList] = useState<ServerList>()
    const [isBase64, setIsBase64] = useState(false)
    const [psList, setPsList] = useState<string[]>([])
    const [uriList, setUriList] = useState<string[]>([])
    const [base64UriList, setBase64UriList] = useState<string[]>([])
    const [errorMsg, setErrorMsg] = useState('')
    const loadList = useDebounce(async () => {
        let serverList = await readServerList()
        if (serverList) {
            if (selectedKeys && selectedKeys.length > 0) {
                serverList = serverList.filter((_, index) => selectedKeys.includes(index))
            }
            setServerList(serverList)
            initPsAndUriList(serverList)
        } else {
            setServerList([])
            setErrorMsg('暂无服务器')
        }
    }, 100)
    useEffect(loadList, [])

    // ==================== init ====================
    const initPsAndUriList = (serverList: ServerList) => {
        const psList = []
        const uriList = []
        for (let i = 0; i < serverList.length; i++) {
            const server = serverList[i]
            psList.push(server.ps)
            uriList.push(serverRowToUri(server))
        }
        setPsList(psList)
        setUriList(uriList)
    }

    const initBase64UriList = () => {
        if (base64UriList.length > 0 || !serverList) return // 不重复计算
        const list = []
        for (let i = 0; i < serverList.length; i++) {
            const server = serverList[i]
            list.push(serverRowToBase64Uri(server))
        }
        setBase64UriList(list)
    }

    // ==================== base ====================
    const getUri = (i: number) => {
        return isBase64 ? base64UriList[i] : uriList[i]
    }

    const handleFormatChange = (isBase64: boolean) => {
        if (isBase64 !== null) setIsBase64(isBase64)
        isBase64 && initBase64UriList()
    }

    const handleAccordion = (i: number) => {
        if (!showKeys.includes(i)) setShowKeys([...showKeys, i])
    }

    // ==================== export text ====================
    const handleExportTextFile = async () => {
        const path = await showSaveDialog({
            title: "Export Backup File",
            filters: [{name: 'Text File', extensions: ['txt']}],
            defaultPath: `doay_servers_${getCurrentYMDHIS()}.txt`,
            canCreateDirectories: true,
        })
        if (!path) return

        let content: string
        if (isBase64) {
            initBase64UriList()
            content = base64UriList.join('\n')
        } else {
            content = uriList.join('\n')
        }
        const ok = await saveTextFile(path, content)
        if (!ok) showSnackbar(`保存文件失败`, 'error')
    }

    // ==================== copy uri ====================
    const handleCopyURI = async (i: number) => {
        const url = getUri(i)
        const ok = await clipboardWriteText(url)
        if (ok) {
            showSnackbar(isBase64 ? '复制 Base64 URI 成功' : '复制 URL 成功', 'success')
        } else {
            showSnackbar(`复制失败`, 'error')
        }
    }

    // ==================== copy svg ====================
    const handleCopyQRCodeSVG = async (i: number) => {
        const svgString = document.querySelector(`.qrcode-${i}`)?.outerHTML
        if (!svgString) return

        const ok = await clipboardWriteText(svgString)
        if (ok) {
            showSnackbar(`复制代码成功`, 'success')
        } else {
            showSnackbar(`复制代码失败`, 'error')
        }
    }

    // ==================== copy image ====================
    const handleCopyQrImage = (i: number) => {
        const svgString = document.querySelector(`.qrcode-${i}`)?.outerHTML
        if (!svgString) return

        svgStringToUint8Array(svgString).then(async ({uint8Array, width, height}: any) => {
            const image = await createImage(uint8Array, width, height)
            if (image) {
                const ok = await clipboardWriteImage(image)
                if (ok) {
                    showSnackbar(`复制图片成功`, 'success')
                } else {
                    showSnackbar(`复制图片失败`, 'error')
                }
            } else {
                showSnackbar(`转换图片失败`, 'error')
            }
        }).catch(error => {
            showSnackbar(error, 'error')
        })
    }

    const svgStringToUint8Array = (svgString: string): Promise<unknown> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject('无法获取 Canvas 上下文')
                return
            }

            const img = new Image()
            img.onload = () => {
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                const imageData = ctx.getImageData(0, 0, img.width, img.height)
                const uint8Array = new Uint8Array(imageData.data.buffer)

                resolve({uint8Array, width: img.width, height: img.height})
            }
            img.onerror = (error) => {
                reject('加载图片失败: ' + error)
            }
            const blob = new Blob([svgString], {type: 'image/svg+xml'})
            img.src = URL.createObjectURL(blob)
        })
    }

    const [showKeys, setShowKeys] = useState<number[]>([0])
    const {SnackbarComponent, showSnackbar} = useSnackbar()
    return <>
        <SnackbarComponent/>
        {!serverList ? (
            <LoadingCard/>
        ) : errorMsg ? (
            <ErrorCard errorMsg={errorMsg}/>
        ) : (<>
            <Card>
                <PageHeader title="导出" backLink="/server"/>
                <Box sx={{p: 2}}>
                    <Stack direction="row" spacing={1} sx={{py: 1, alignItems: 'center', justifyContent: 'space-between'}}>
                        <ToggleButtonGroup exclusive value={isBase64} onChange={(_, v: boolean) => handleFormatChange(v)}>
                            <ToggleButton value={false}>URL 格式</ToggleButton>
                            <ToggleButton value={true}>Base64 URI 格式</ToggleButton>
                        </ToggleButtonGroup>
                        <Button variant="contained" onClick={handleExportTextFile} startIcon={<SaveAltIcon/>}>导出备份文件</Button>
                    </Stack>
                    {psList.map((ps, i) => (
                        <Accordion elevation={3} key={i} defaultExpanded={i === 0} onChange={() => handleAccordion(i)}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon/>}>
                                <Typography component="span">{ps}</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{textAlign: 'center'}}>
                                {showKeys.includes(i) && (<>
                                    <div className="qr-box">
                                        <QRCodeSVG className={`qrcode-${i}`} value={getUri(i)} size={256} marginSize={2} xmlns="http://www.w3.org/2000/svg"/>
                                    </div>
                                    <Box sx={{mt: 1}}>
                                        <TextField value={getUri(i)} variant="outlined" size="small" fullWidth multiline disabled/>
                                    </Box>
                                    <Stack direction="row" spacing={1} sx={{mt: 1, alignItems: 'center', justifyContent: 'center'}}>
                                        <Button variant="contained" color="secondary" startIcon={<ContentCopyIcon/>}
                                                onClick={() => handleCopyURI(i)}>{isBase64 ? '复制 Base64 URI' : '复制 URL'}</Button>
                                        <Button variant="contained" color="success" startIcon={<CollectionsIcon/>} onClick={() => handleCopyQrImage(i)}>复制二维码图片</Button>
                                        <Button variant="contained" color="warning" startIcon={<FileCopyIcon/>} onClick={() => handleCopyQRCodeSVG(i)}>复制二维码 SVG 代码</Button>
                                    </Stack>
                                </>)}
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            </Card>
        </>)}
    </>
}

export default ServerExport
