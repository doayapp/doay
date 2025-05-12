export function isWindows() {
    return /Win/i.test(navigator.userAgent)
}

export function isMacOS() {
    return /Mac/i.test(navigator.userAgent)
}

export function isLinux() {
    return /Linux/i.test(navigator.userAgent)
}

export const IS_WINDOWS = isWindows()
export const IS_MAC_OS = isMacOS()
export const IS_LINUX = isLinux()

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null
    return function (this: any, ...args: Parameters<T>) {
        const later = () => {
            timeout = null
            func.apply(this, args)
        }
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

export const sizeToUnit = (size: number, base: number = 1024): string => {
    size = Number(size) || 0
    if (size <= 0) return '0 B'

    const units = ['B', 'K', 'M', 'G', 'T', 'P', 'E']
    let unitIndex = 0
    while (size >= base && unitIndex < units.length - 1) {
        size /= base
        unitIndex++
    }

    const decimalPlaces = unitIndex === 0 ? 0 : 2
    return `${size.toFixed(decimalPlaces)} ${units[unitIndex]}`
}

export const calcPct = (used: number, total: number): string => {
    used = Number(used) || 0
    total = Number(total) || 0
    if (total === 0) return '0%'
    const percentage = Math.min(((used / total) * 100), 100).toFixed(1)
    return `${percentage}%`
}

export function getCurrentYMDHIS(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

export const formatTimestamp = (timestamp: number): string => {
    timestamp = Number(timestamp) || 0
    if (timestamp === 0) return '-'

    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const padZero = (num: number) => (Number(num) || 0).toString().padStart(2, '0')

export const formatTime = (seconds: number): string => {
    seconds = Number(seconds) || 0
    const days = Math.floor(seconds / (3600 * 24))
    const hours = Math.floor((seconds % (3600 * 24)) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    const parts = []
    if (days > 0) parts.push(`${padZero(days)} 天`)
    if (hours > 0 || days > 0) parts.push(`${padZero(hours)} 小时`)
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${padZero(mins)} 分钟`)
    parts.push(`${padZero(secs)} 秒`)
    return parts.join(' ')
}

export const formatFloat = (num: number, decimal: number = 2): string => {
    num = Number(num) || 0
    if (num < 0) num = 0
    return num.toFixed(decimal)
}

export function formatDuration(seconds: number, digits: number = 1): string {
    if (seconds < 60) {
        return `${seconds.toFixed(digits)} s`
    } else if (seconds < 3600) {
        const minutes = seconds / 60
        return `${minutes.toFixed(digits)} m`
    } else {
        const hours = seconds / 3600
        return `${hours.toFixed(digits)} h`
    }
}

export function formatSecond(duration: number): string {
    duration = Number(duration) || 0
    return duration >= 1000 ? `${(duration / 1000).toFixed(2)} s` : `${duration} ms`
}

export function getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateUniqueId(): string {
    const random = Math.floor(Math.random() * 10000)
    const combined = Date.now() * 10000 + random
    return combined.toString(36)
}

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

// 支持验证 5 个版本的 UUID
export function isValidUUID(uuid: string): boolean {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return regex.test(uuid)
}

const logNameMap: Record<string, string> = {
    'doay.log': 'Doay 运行日志',
    'doay_web_interface.log': 'Doay 交互日志',
    'web_server.log': 'Web 访问日志',
    'xray_access.log': 'Xray 请求日志',
    'xray_error.log': 'Xray 运行日志',
    'xray_server.log': 'Xray 启动日志',
}

export const formatLogName = (filename: string, showFull: boolean = false): string => {
    return !logNameMap[filename] ? filename : (showFull ? `${logNameMap[filename]} (${filename})` : logNameMap[filename])
}

export function formatUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        urlObj.protocol = urlObj.protocol.toLowerCase()
        urlObj.hostname = urlObj.hostname.toLowerCase()
        return urlObj.toString()
    } catch (error) {
        return url
    }
}

export function isValidUrl(url: string): boolean {
    const urlPattern = /^(https?:\/\/)?([\da-z-.]+)(\.[a-z.]{2,6})?(:\d+)?.*?$/i
    return urlPattern.test(url)
}

export function validateIp(value: string) {
    // IPv4 正则表达式
    const ipv4Pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    /*// IPv6 正则表达式
    const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^[0-9a-fA-F]{1,4}::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:):([0-9a-fA-F]{1,4}:){0,4}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){2}:([0-9a-fA-F]{1,4}:){0,3}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){3}:([0-9a-fA-F]{1,4}:){0,2}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){4}:([0-9a-fA-F]{1,4}:)?[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){5}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){6}$/
    // 支持 IPv4 映射的 IPv6 地址
    const ipv4MappedIpv6Pattern = /^::(ffff(:0{1,4})?:)?((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipv4Pattern.test(value) || ipv6Pattern.test(value) || ipv4MappedIpv6Pattern.test(value)*/
    return ipv4Pattern.test(value)
}

export function validatePort(value: number) {
    return value > 0 && value <= 65535
}

export function formatPort(value: any): string {
    const num = Math.min(Math.max(Number(value), 0), 65535)
    return num ? String(num) : ''
}

export const processLines = (input: string, delimiter: string = '\n'): string[] => {
    return input
        .split(delimiter) // 按指定分隔符分割
        .map(line => line.trim()) // 清理每行的前后空格
        .filter(line => line.length > 0) // 过滤掉空行
}

export function processDomain(domain: string, validate: boolean = false, sort: boolean = true): string {
    domain = domain.trim()
    if (domain.length === 0) return ''

    // 清理每行字符串的两端空格，排除空字符串行
    const cleanedDomains = domain.split('\n')
        .map(d => d.trim())
        .filter(d => {
            if (d.length === 0) return false
            // 验证域名合法性
            if (validate) {
                const domainPattern = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/
                return domainPattern.test(d)
            }
            return true
        })

    // 去重
    const uniqueDomains = [...new Set(cleanedDomains)]

    // 根据 sort 参数决定是否排序
    if (sort) uniqueDomains.sort()

    // 重新用 \n 连接
    return uniqueDomains.join('\n')
}

export function processIP(ip: string, sort: boolean = true): string {
    ip = ip.trim()
    if (ip.length === 0) return ''

    // 清理每行字符串的两端空格，排除空字符串行
    const cleanedIPs = ip.split('\n')
        .map(i => i.trim())
        .filter(i => i.length > 0)

    // 去重
    const uniqueIPs = [...new Set(cleanedIPs)]

    // 根据 sort 参数决定是否排序
    if (sort) uniqueIPs.sort()

    // 重新用 \n 连接
    return uniqueIPs.join('\n')
}

export function processPort(port: string): string {
    port = port.trim()
    if (port.length === 0) return ''

    // 清理每行字符串的两端空格，排除空字符串行
    const cleanedPorts = port.split('\n')
        .map(p => p.trim())
        .filter(p => {
            if (p.length === 0) return false

            // 验证单个端口（如 "123"）
            if (/^\d+$/.test(p)) {
                const portNum = Number(p)
                return portNum > 0 && portNum <= 65535
            }

            // 验证端口范围（如 "1000-2000"）
            if (/^\d+-\d+$/.test(p)) {
                const [start, end] = p.split('-').map(Number)
                return start > 0 && start <= 65535 && end > 0 && end <= 65535 && start <= end
            }

            return false // 其他格式无效
        })

    // 去重，并排序
    const uniquePorts = [...new Set(cleanedPorts)].sort()

    // 重新用 \n 连接
    return uniquePorts.join('\n')
}
