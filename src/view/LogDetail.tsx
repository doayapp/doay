import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FixedSizeList as List } from 'react-window'

import {
    Stack, Paper, Button, Typography,
    FormControlLabel, Checkbox
} from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'

import { useSnackbar } from '../component/useSnackbar.tsx'
import { useVisibility } from "../hook/useVisibility.ts"
import { readLogFile } from '../util/invoke.ts'
import { formatLogName } from "../util/util.ts"
import highlightLog from '../util/highlightLog'
import { useDebounce } from "../hook/useDebounce.ts"

const LogDetail: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(4), [setNavState])

    const [searchParams] = useSearchParams()
    const filename = searchParams.get('filename')
    if (!filename) {
        return <Typography variant="h6">未指定日志文件</Typography>
    }

    const navigate = useNavigate()

    const [reverse, setReverse] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [startPosition, setStartPosition] = useState(-1)
    const [logList, setLogList] = useState<string[]>(['日志加载中...'])

    const defaultPrevLogContent = {fileSize: 0, start: 0, end: 0, len: 0}
    const [prevLogContent, setPrevLogContent] = useState<PrevLogContent>(defaultPrevLogContent)

    // 获取日志内容
    const startPositionCache = useRef<number[]>([]) // 缓存 startPosition 读取过的位置，防止重复合并数据
    const htmlCache = useRef<string[]>([]) // 缓存 html，按行存放
    const fetchLogContent = (reverse: boolean, startPosition: number) => {
        (async () => {
            setStartPosition(startPosition)
            const logData = await readLogFile(filename, reverse, startPosition) as LogContent
            if (!logData) return

            setPrevLogContent({fileSize: logData.size, start: logData.start, end: logData.end, len: logData.content.length})

            // console.log('fileSize:', logData.size, 'start:', logData.start, 'end:', logData.end, 'len:', logData.content.length)
            // console.log('reverse:', reverse, 'autoRefresh:', autoRefresh, 'startPosition:', startPosition)

            const htmlLogContent = highlightLog(logData.content)
            if (!autoRefresh) {
                // 防止重复合并数据
                if (startPositionCache.current.includes(logData.start)) return
                startPositionCache.current.push(logData.start)

                if (reverse) {
                    htmlCache.current = [...htmlLogContent, ...htmlCache.current]
                } else {
                    htmlCache.current = [...htmlCache.current, ...htmlLogContent]
                }
                setLogList(htmlCache.current)
            } else {
                setLogList(htmlLogContent) // 自动刷新时，直接替换全部内容，简化程序逻辑
            }
        })()
    }

    // 监听 logList 变化，滚动到什么位置
    useEffect(() => {
        if (autoRefresh) scrollTo('bottom')
        else if (startPosition === -1) scrollTo(reverse ? 'bottom' : 'top')
    }, [logList])

    // 初始加载
    useEffect(() => {
        if (!filename) return
        fetchLogContent(reverse, -1)
    }, [])

    // 自动刷新日志内容
    const intervalRef = useRef<number>(0)
    const isVisibility = useVisibility()
    useEffect(() => {
        // 只有在查看日志文件末尾时，才开启自动刷新日志
        // 只在窗口可视时才自动刷新日志，以减小资源消耗
        if (reverse && isVisibility && autoRefresh && filename) {
            intervalRef.current = setInterval(() => {
                fetchLogContent(true, -1)
            }, 3000)
        }

        return () => clearInterval(intervalRef.current)
    }, [isVisibility, autoRefresh, filename])

    const isScrollingRef = useRef(false)
    const scrollTo = (position: 'top' | 'bottom') => {
        if (isScrollingRef.current || !listRef.current) return
        isScrollingRef.current = true

        requestAnimationFrame(() => {
            if (position === 'top') {
                listRef.current!.scrollTo(0)
            } else {
                // listRef.current!.scrollTo(0, Infinity)
                listRef.current!.scrollToItem(logList.length - 1, 'end')
            }
            isScrollingRef.current = false
        })
    }

    // 切换 reverse 方向，重新加载日志
    const handleReverseChange = (reverse: boolean) => {
        setReverse(reverse)

        // 重置
        startPositionCache.current = []
        htmlCache.current = []
        setPrevLogContent(defaultPrevLogContent)

        // 重新加载日志
        fetchLogContent(reverse, -1)
    }

    // 切换自动刷新状态
    const handleAutoRefreshChange = (autoRefresh: boolean) => {
        setAutoRefresh(autoRefresh)
        autoRefresh && setReverse(true)
    }

    // 防抖处理，减少滚动时频繁请求日志内容
    const debouncedScroll = useDebounce((isAtTop: boolean, isAtBottom: boolean) => {
        if (!isAtBottom) {
            clearInterval(intervalRef.current) // 停止自动刷新日志
            setAutoRefresh(false)
        }
        if (autoRefresh) return

        if (reverse) {
            // 向上滚动加载更多
            if (isAtTop) {
                if (prevLogContent.fileSize > 0 && prevLogContent.start === 0) {
                    showSnackbar('已经到最顶部了')
                } else if (prevLogContent.start > 0) {
                    fetchLogContent(reverse, prevLogContent.start - 1)
                }
            }
        } else {
            // 向下滚动加载更多
            if (isAtBottom) {
                if (prevLogContent.fileSize > 0 && prevLogContent.end === prevLogContent.fileSize) {
                    showSnackbar('已经到最底部了')
                } else if (prevLogContent.end > 0) {
                    fetchLogContent(reverse, prevLogContent.end + 1)
                }
            }
        }
    }, 300)

    const listRef = useRef<List>(null)
    const handleListScroll = ({scrollOffset}: { scrollOffset: number }) => {
        if (!listRef.current) return

        const isAtTop = scrollOffset === 0
        const isAtBottom = scrollOffset + window.innerHeight - 75 >= listRef.current.props.itemSize * logList.length
        debouncedScroll(isAtTop, isAtBottom)
    }

    const [listHeight, setListHeight] = useState(window.innerHeight - 75)
    useEffect(() => {
        const handleResize = () => {
            setListHeight(window.innerHeight - 75)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const Row = ({index, style}: { index: number; style: React.CSSProperties }) => (
        <pre style={style} dangerouslySetInnerHTML={{__html: logList[index] + "\n"}}/>
    )

    const {SnackbarComponent, showSnackbar} = useSnackbar('br')
    return (<>
        <SnackbarComponent/>
        <Stack direction="row" sx={{justifyContent: "space-between", alignItems: "center"}}>
            <Stack direction="row" spacing={2} sx={{justifyContent: "center", alignItems: "center"}}>
                <Button sx={{p: 1, mr: 2, minWidth: 0, borderRadius: '50%', '&:hover': {bgColor: 'action.hover'}}}
                        onClick={() => navigate('/log')}>
                    <ArrowBackIosNewIcon fontSize="small"/>
                </Button>
                <Typography variant="body1">{formatLogName(filename, true)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{justifyContent: "center", alignItems: "center"}}>
                {!autoRefresh && (
                    <FormControlLabel
                        control={<Checkbox checked={reverse} onChange={(e) => handleReverseChange(e.target.checked)}/>}
                        label="查看末尾"/>
                )}
                <FormControlLabel
                    control={<Checkbox checked={autoRefresh} onChange={(e) => handleAutoRefreshChange(e.target.checked)}/>}
                    label="自动刷新"/>
            </Stack>
        </Stack>
        <Paper elevation={5} sx={{p: 1, pr: 0, height: 'calc(100vh - 65px)', overflow: 'hidden', position: 'fixed', bottom: 10, left: 140, right: 10}}>
            <List className="log-view scr-w1" ref={listRef} onScroll={handleListScroll} itemCount={logList.length} itemSize={20}
                  width="100%" height={listHeight}>
                {Row}
            </List>
        </Paper>
    </>)
}

export default LogDetail
