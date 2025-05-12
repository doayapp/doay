import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Box, Button, Link,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DeleteIcon from '@mui/icons-material/Delete'

import { LoadingCard, ErrorCard } from "../component/useCard.tsx"
import { useDialog } from "../component/useDialog.tsx"
import { clearLogAll, getDoayAppDir, readLogList } from "../util/invoke.ts"
import { sizeToUnit, formatLogName } from "../util/util.ts"
import { openDir } from "../util/tauri.ts"
import { useDebounce } from "../hook/useDebounce.ts"

const Log: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(4), [setNavState])
    const navigate = useNavigate()

    const [logList, setLogList] = useState<LogList>()
    const [errorMsg, setErrorMsg] = useState('')
    const loadList = useDebounce(async () => {
        let logList = await readLogList()
        if (logList) {
            setLogList(logList)
        } else {
            setLogList([])
            setErrorMsg('暂无日志')
        }
    }, 100)
    useEffect(loadList, [])

    const handleClearLogs = () => {
        dialogConfirm('确认清空', `确定要清空所有日志吗？`, async () => {
            const ok = await clearLogAll()
            ok && loadList()
        })
    }

    const handleOpenLogDir = async () => {
        let dir = await getDoayAppDir()
        if (dir) await openDir(`${dir}/logs/`)
    }

    const {DialogComponent, dialogConfirm} = useDialog()
    return (<>
        <DialogComponent/>
        {!logList ? (
            <LoadingCard/>
        ) : errorMsg ? (
            <ErrorCard errorMsg={errorMsg}/>
        ) : (<>
            <Box sx={{mb: 1}}>
                <Button variant="contained" onClick={handleOpenLogDir} startIcon={<FolderOpenIcon/>}>打开日志目录</Button>
                <Button variant="contained" color="error" onClick={handleClearLogs} startIcon={<DeleteIcon/>} sx={{ml: 1}}>清空日志</Button>
            </Box>
            <TableContainer component={Card}>
                <Table sx={{minWidth: 600}}>
                    <TableHead>
                        <TableRow>
                            <TableCell>日志名称</TableCell>
                            <TableCell align="right" sx={{width: '150px'}}>日志大小</TableCell>
                            <TableCell align="right" sx={{width: '180px'}}>最近更新</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logList.map((row) => (
                            <TableRow hover key={row.filename} sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                <TableCell component="th" scope="row" sx={{cursor: 'pointer'}}>
                                    <Link underline="hover" onClick={() => navigate(`/log_detail?filename=${row.filename}`)}>
                                        {formatLogName(row.filename)}
                                    </Link>
                                </TableCell>
                                <TableCell align="right">{sizeToUnit(row.size)}</TableCell>
                                <TableCell align="right">{row.last_modified}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>)}
    </>)
}

export default Log
