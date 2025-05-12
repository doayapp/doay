import { log } from './invoke.ts'

/**
 * 计算字符串的哈希值
 * @param input 输入字符串
 * @param algorithm 哈希算法，默认为 'SHA-256', 可选 'MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512' 等
 * @returns 哈希值的十六进制字符串
 */
export async function hashString(input: string, algorithm: string = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest(algorithm, data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashJson(data: any, algorithm: string = 'SHA-256'): Promise<string> {
    const s = safeJsonStringify(data)
    return await hashString(s, algorithm)
}

export function encodeBase64(str: string): string {
    try {
        const encoder = new TextEncoder()
        const data = encoder.encode(str)
        return btoa(String.fromCharCode(...data))
    } catch (error) {
        log.error('Base64 encode error:', error)
        return ''
    }
}

export function decodeBase64(base64: string): string {
    try {
        const binaryString = atob(base64)
        const bytes = new Uint8Array([...binaryString].map(char => char.charCodeAt(0)))
        const decoder = new TextDecoder()
        return decoder.decode(bytes)
    } catch (error) {
        log.error('Base64 decode error:', error)
        return ''
    }
}

export function safeJsonStringify(data: any): string {
    try {
        return JSON.stringify(data)
    } catch (e) {
        log.error('JSON.stringify failed:', e)
        return '{}'
    }
}

export function safeJsonParse(jsonString: string): any {
    try {
        return JSON.parse(jsonString)
    } catch (e) {
        log.error('JSON.parse failed:', e)
        return null
    }
}

export function safeDecodeURI(encodedURI: string): string {
    try {
        return decodeURIComponent(encodedURI)
    } catch (e) {
        log.error('Failed to decode URI component:', e)
        return encodedURI || ''
    }
}

export function deepSafeDecodeURI(data: any): any {
    if (typeof data === 'string') {
        return safeDecodeURI(data)
    } else if (Array.isArray(data)) {
        return data.map(item => deepSafeDecodeURI(item))
    } else if (data && typeof data === 'object') {
        const result: any = {}
        for (const key in data) {
            result[key] = deepSafeDecodeURI(data[key])
        }
        return result
    }
    return data
}
