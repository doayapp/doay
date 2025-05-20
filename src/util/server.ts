import { log, readServerList, shouldLog } from './invoke.ts'
import { decodeBase64, deepSafeDecodeURI, encodeBase64, safeDecodeURI, safeJsonParse, safeJsonStringify, hashJson } from './crypto.ts'
import { cutStr, generateUniqueId, urlToObject } from "./util.ts"

// 排出重复数据
export async function getNewServerList(input: string) {
    let errNum = 0
    let existNum = 0
    let newNum = 0
    let newServerList: ServerList = []
    let serverList = await readServerList() || []
    const arr = input.split('\n')
    for (let uri of arr) {
        uri = uri.trim()
        if (!uri) continue

        const row = await uriToServerRow(uri)
        if (!row) {
            errNum++
            continue
        }

        let isExist = serverList.some(server => server.hash === row.hash)
        if (isExist) {
            existNum++
            continue
        }

        isExist = newServerList.some(server => server.hash === row.hash)
        if (isExist) {
            existNum++
            continue
        }

        newNum++
        newServerList.push(row)
    }

    newServerList = [...newServerList, ...serverList]
    return {newServerList, errNum, existNum, newNum}
}

export function isValidUri(uri: string): boolean {
    try {
        new URL(uri)
        return true
    } catch (e) {
        return false
    }
}

export async function uriToServerRow(uri: string): Promise<ServerRow | null> {
    if (!isValidUri(uri)) {
        log.error("Invalid URI:", uri)
        return null
    }
    try {
        let row: ServerRow | null = null
        if (uri.startsWith('vmess://')) {
            row = await uriToVmessRow(uri)
        } else if (uri.startsWith('vless://')) {
            row = await uriToVlessRow(uri)
        } else if (uri.startsWith('ss://')) {
            row = await uriToSsRow(uri)
        } else if (uri.startsWith('trojan://')) {
            row = await uriToTrojanRow(uri)
        } else {
            log.error("Unsupported protocol, URI:", uri)
        }

        if (row !== null) {
            row.ps = row.ps || row.host || 'untitled'
            row.ps = cutStr(row.ps, 50) // 限制长度，避免影响界面显示
        }

        if (shouldLog('trace')) {
            uri = uri.replace(/^[a-z]+:/, 'http:') // 新版本 webview 更严格地按 WHATWG URL 规范解析 URL，不合法的链接会丢失部分参数
            log.trace(`Parsed URI: ${JSON.stringify(row)}, URL Object: ${JSON.stringify(urlToObject(new URL(uri)))}, userAgent: ${navigator.userAgent}`)
        }

        return row
    } catch (e) {
        log.error("Failed to parse URI:", uri, e)
        return null
    }
}

export function getScy(row: { scy: string, net?: string, tls?: boolean }): string {
    let scy = row.scy
    if (row.tls) scy += '+tls'
    if (row.net) scy += '+' + row.net
    return scy
}

function parseUri(uri: string) {
    const [href, protocol, username, hostname, port, query, hash] = uri.match(/^([a-z]+):\/\/([^@]+)@?([^:/?#]+):?(\d+)?\?([^#]*)#?(.*)?$/i) || []

    let params: any = {}
    query?.split("&").forEach(kv => {
        const [k, v] = kv.split("=")
        params[k] = v
    })

    const r = {href, protocol, username, hostname, port, query, params, hash}
    log.trace(`Regex parsing result: ${JSON.stringify(r)}, URI: ${uri}`)

    return r
}

/**
 * VMess / VLESS 分享链接提案: https://github.com/XTLS/Xray-core/discussions/716
 *
 * PS: VMess + VLESS 混在一起，人都看傻了，完全不想兼容。[设计目标：导入兼容一下，导出不考虑兼容别的软件，以简单为主]
 * 单词有些简化，有些不简化，简直乱七八糟，encryption 为什么不简化为 enc ？
 * 想区分 security 和 encryption，又因为历史问题，配置文件和分享链接，完全变两套规则，把人搞的更懵逼。
 *
 * # VMess + TCP，不加密（仅作示例，不安全）
 * vmess://99c80931-f3f1-4f84-bffd-6eed6030f53d@qv2ray.net:31415?encryption=none#VMessTCPNaked
 *
 * # VMess + TCP，自动选择加密。编程人员特别注意不是所有的 URL 都有问号，注意处理边缘情况。
 * vmess://f08a563a-674d-4ffb-9f02-89d28aec96c9@qv2ray.net:9265#VMessTCPAuto
 *
 * # VMess + TCP，手动选择加密
 * vmess://5dc94f3a-ecf0-42d8-ae27-722a68a6456c@qv2ray.net:35897?encryption=aes-128-gcm#VMessTCPAES
 *
 * # VMess + TCP + TLS，内层不加密
 * vmess://136ca332-f855-4b53-a7cc-d9b8bff1a8d7@qv2ray.net:9323?encryption=none&security=tls#VMessTCPTLSNaked
 *
 * # VMess + TCP + TLS，内层也自动选择加密
 * vmess://be5459d9-2dc8-4f47-bf4d-8b479fc4069d@qv2ray.net:8462?security=tls#VMessTCPTLS
 *
 * # VMess + TCP + TLS，内层不加密，手动指定 SNI
 * vmess://c7199cd9-964b-4321-9d33-842b6fcec068@qv2ray.net:64338?encryption=none&security=tls&sni=fastgit.org#VMessTCPTLSSNI
 *
 * # VMess + WebSocket + TLS
 * vmess://44efe52b-e143-46b5-a9e7-aadbfd77eb9c@qv2ray.net:6939?type=ws&security=tls&host=qv2ray.net&path=%2Fsomewhere#VMessWebSocketTLS
 */
async function uriToVmessRow(uri: string): Promise<ServerRow> {
    let ps = ''
    let data: VmessRow

    const url = new URL(uri.replace(/^vmess:/, 'http:'))
    if (url.search) {
        if (url.hash) ps = url.hash.slice(1).trim()
        const p = new URLSearchParams(url.search)
        data = {
            add: url.hostname,
            port: Number(url.port) || 0,
            id: url.username,
            aid: p.get('aid') || '0',

            net: p.get('net') || p.get('type') || 'raw',
            scy: p.get('scy') || p.get('security') || p.get('enc') || p.get('encryption') || 'auto',

            host: p.get('host') || '',
            path: p.get('path') || p.get('sni') || p.get('serviceName') || p.get('seed') || '',
            type: p.get('type') || p.get('headerType') || '',

            mode: p.get('mode') || '',

            tls: p.get('tls') === 'tls' || p.get('security') === 'tls',
            alpn: p.get('alpn') || '',
            fp: p.get('fp') || 'chrome'
        }
    } else {
        const base64 = uri.replace('vmess://', '')
        const decoded = decodeBase64(base64)
        const d = safeJsonParse(decoded)
        ps = d.ps || ''
        data = {
            add: d.add || '',
            port: Number(d.port) || 0,
            id: d.id || '',
            aid: d.aid || '0',

            net: d.net || 'raw',
            scy: d.scy || 'auto',

            host: d.host || '',
            path: d.path || '',
            type: d.type || '',

            mode: d.mode || '',

            tls: d.tls === 'tls',
            alpn: d.alpn || '',
            fp: d.fp || 'chrome'
        }
    }

    ps = safeDecodeURI(ps)
    data = deepSafeDecodeURI(data)

    if (data.net === 'tcp') data.net = 'raw'

    return {
        id: generateUniqueId(),
        ps,
        on: 0,
        type: 'vmess',
        host: `${data.add}:${data.port}`,
        scy: getScy(data),
        hash: await hashJson(data),
        data
    }
}

/**
 * VMess / VLESS 分享链接提案: https://github.com/XTLS/Xray-core/discussions/716
 *
 * ！！！下面这 3 种设计，一个都不去支持，我已经把这些归类到 vmess，让 vless 保存简洁。 over
 *
 * # VLESS + TCP + XTLS
 * vless://b0dd64e4-0fbd-4038-9139-d1f32a68a0dc@qv2ray.net:3279?security=xtls&flow=rprx-xtls-splice#VLESSTCPXTLSSplice
 *
 * # VLESS + mKCP + Seed
 * vless://399ce595-894d-4d40-add1-7d87f1a3bd10@qv2ray.net:50288?type=kcp&seed=69f04be3-d64e-45a3-8550-af3172c63055#VLESSmKCPSeed
 *
 * # VLESS + mKCP + Seed，伪装成 Wireguard
 * vless://399ce595-894d-4d40-add1-7d87f1a3bd10@qv2ray.net:41971?type=kcp&headerType=wireguard&seed=69f04be3-d64e-45a3-8550-af3172c63055#VLESSmKCPSeedWG
 */
async function uriToVlessRow(uri: string): Promise<ServerRow> {
    let ps = ''
    let data: VlessRow

    // 新版本 Edge 浏览器内核，非标准链接会丢失部分参数
    const url = new URL(uri.replace(/^vless:/, 'http:'))
    if (url.search) {
        let add = url.hostname || ''
        let port = Number(url.port) || 0
        let id = url.username || ''

        if (!id) {
            let rUrl = parseUri(uri)
            if (rUrl.username) id = rUrl.username
            if (rUrl.hostname) add = rUrl.hostname
            if (rUrl.port) port = Number(rUrl.port) || 0
        }

        if (url.hash) ps = url.hash.slice(1).trim()

        const p = new URLSearchParams(url.search)
        data = {
            add: add,
            port: port,
            id: id,

            net: p.get('net') || p.get('type') || 'raw',
            scy: p.get('scy') || p.get('security') || 'none',

            host: p.get('host') || '',
            path: p.get('path') || p.get('sni') || p.get('serviceName') || '',
            sni: p.get('sni') || p.get('serviceName') || '',

            mode: p.get('mode') || '',
            extra: p.get('extra') || '',

            alpn: p.get('alpn') || '',
            fp: p.get('fp') || 'chrome',

            flow: p.get('flow') || '',

            pbk: p.get('pbk') || '',
            sid: p.get('sid') || '',
            spx: p.get('spx') || ''
        }
        if (data.extra) {
            try {
                data.extra = decodeBase64(data.extra)
            } catch (e) {
                log.error('Failed to decode extra:', e)
            }
        }
    } else {
        const base64 = uri.replace('vless://', '')
        const decoded = decodeBase64(base64)
        const d = safeJsonParse(decoded)
        ps = d.ps || ''
        data = {
            add: d.add || '',
            port: Number(d.port) || 0,
            id: d.id || '',

            net: d.net || 'raw',
            scy: d.scy || 'none',

            host: d.host || '',
            path: d.path || '',
            sni: d.sni || '',

            mode: d.mode || '',
            extra: d.extra || '',

            alpn: d.alpn || '',
            fp: d.fp || '',

            flow: d.flow || '',

            pbk: d.pbk || '',
            sid: d.sid || '',
            spx: d.spx || ''
        }
    }

    ps = safeDecodeURI(ps)
    data = deepSafeDecodeURI(data)

    if (data.net === 'tcp') data.net = 'raw'
    // if (data.flow) data.net = 'xhttp'

    return {
        id: generateUniqueId(),
        ps: ps,
        on: 0,
        type: 'vless',
        host: `${data.add}:${data.port}`,
        scy: getScy(data),
        hash: await hashJson(data),
        data
    }
}

async function uriToSsRow(uri: string): Promise<ServerRow> {
    let ps = ''
    let data: SsRow

    const url = new URL(uri.replace(/^ss:/, 'http:'))
    if (url.username) {
        if (url.hash) ps = url.hash.slice(1).trim()
        const [method, password] = decodeBase64(safeDecodeURI(url.username)).split(':')
        data = {
            add: url.hostname,
            port: Number(url.port) || 0,
            pwd: password || '',
            scy: method || '',
        }
    } else {
        const base64 = uri.replace('ss://', '')
        const decoded = decodeBase64(base64)
        const d = safeJsonParse(decoded)
        ps = d.ps || ''
        data = {
            add: d.add || '',
            port: Number(d.port) || 0,
            pwd: d.pwd || '',
            scy: d.scy || '',
        }
    }

    ps = safeDecodeURI(ps)
    data = deepSafeDecodeURI(data)

    return {
        id: generateUniqueId(),
        ps,
        on: 0,
        type: 'ss',
        host: `${data.add}:${data.port}`,
        scy: data.scy,
        hash: await hashJson(data),
        data
    }
}

async function uriToTrojanRow(uri: string): Promise<ServerRow> {
    let ps = ''
    let data: TrojanRow

    const url = new URL(uri.replace(/^trojan:/, 'http:'))
    if (url.search) {
        if (url.hash) ps = url.hash.slice(1).trim()
        const p = new URLSearchParams(url.search)
        data = {
            add: url.hostname,
            port: Number(url.port) || 0,
            pwd: url.username,

            net: p.get('net') || p.get('type') || '',
            scy: 'tls',

            host: p.get('host') || '',
            path: p.get('path') || p.get('sni') || p.get('serviceName') || '',
        }
    } else {
        const base64 = uri.replace('trojan://', '')
        const decoded = decodeBase64(base64)
        const d = safeJsonParse(decoded)
        ps = d.ps || ''
        data = {
            add: d.add || '',
            port: Number(d.port) || 0,
            pwd: d.pwd || '',

            net: d.net || '',
            scy: d.scy || 'tls',

            host: d.host || '',
            path: d.path || '',
        }
    }

    ps = safeDecodeURI(ps)
    data = deepSafeDecodeURI(data)

    return {
        id: generateUniqueId(),
        ps,
        on: 0,
        type: 'trojan',
        host: `${data.add}:${data.port}`,
        scy: getScy(data),
        hash: await hashJson(data),
        data
    }
}

export function serverRowToUri(row: ServerRow): string {
    const {type, data, ps} = row
    try {
        switch (type) {
            case 'vmess':
                return vmessRowToUri(data as VmessRow, ps)
            case 'vless':
                return vlessRowToUri(data as VlessRow, ps)
            case 'ss':
                return ssRowToUri(data as SsRow, ps)
            case 'trojan':
                return trojanRowToUri(data as TrojanRow, ps)
            default:
                log.error("Unknown server type:", type)
                return ''
        }
    } catch (e) {
        log.error("Error converting server row to URI:", e)
        return ''
    }
}

function vmessRowToUri(row: VmessRow, ps: string): string {
    const url = new URL('http://dummy')
    url.hostname = row.add
    url.port = row.port.toString()
    url.username = row.id
    url.hash = ps ? `#${ps}` : ''

    const p = new URLSearchParams()
    if (row.aid) p.set('aid', row.aid.toString())

    if (row.net) p.set('net', row.net)
    if (row.scy) p.set('scy', row.scy)

    if (row.host) p.set('host', row.host)
    if (row.path) p.set('path', row.path)

    if (row.type) p.set('type', row.type)
    if (row.mode) p.set('mode', row.mode)

    if (row.tls) {
        p.set('tls', 'tls')
        if (row.alpn) p.set('alpn', row.alpn)
        if (row.fp) p.set('fp', row.fp)
    }

    url.search = p.toString()
    return url.toString().replace(/^http:/, 'vmess:').replace('/?', '?')
}

function vlessRowToUri(row: VlessRow, ps: string): string {
    const url = new URL('http://dummy')
    url.username = row.id
    url.hostname = row.add
    url.port = row.port.toString()
    url.hash = ps ? `#${ps}` : ''

    const p = new URLSearchParams()
    p.set('encryption', 'none')
    p.set('security', row.scy || 'none')
    p.set('type', row.net || 'raw')

    if (row.host) p.set('host', row.host)
    if (row.path) p.set('path', row.path)

    if (row.mode) p.set('mode', row.mode)
    if (row.extra) p.set('extra', encodeBase64(row.extra))

    if (row.alpn) p.set('alpn', row.alpn)
    if (row.fp) p.set('fp', row.fp)

    if (row.flow) p.set('flow', row.flow)

    if (row.pbk) p.set('pbk', row.pbk)
    if (row.sid) p.set('sid', row.sid)
    if (row.spx) p.set('spx', row.spx)

    url.search = p.toString()
    return url.toString().replace(/^http:/, 'vless:').replace('/?', '?')
}

function ssRowToUri(row: SsRow, ps: string): string {
    const url = new URL('http://dummy')
    url.hostname = row.add
    url.port = row.port.toString()
    url.username = encodeBase64(`${row.scy}:${row.pwd}`)
    url.hash = ps ? `#${ps}` : ''
    return url.toString().replace(/^http:/, 'ss:').replace('/#', '#')
}

function trojanRowToUri(row: TrojanRow, ps: string): string {
    const url = new URL('http://dummy')
    url.hostname = row.add
    url.port = row.port.toString()
    url.username = row.pwd
    url.hash = ps ? `#${ps}` : ''

    const p = new URLSearchParams()
    p.set('encryption', 'none')
    p.set('security', 'tls')
    p.set('type', row.net || 'grpc')

    if (row.host) p.set('host', row.host)
    if (row.path) row.net !== 'grpc' ? p.set('path', row.path) : p.set('serviceName', row.path)

    url.search = p.toString()
    return url.toString().replace(/^http:/, 'trojan:').replace('/?', '?')
}

export function serverRowToBase64Uri(row: ServerRow): string {
    const {type, data, ps} = row
    try {
        switch (type) {
            case 'vmess':
                return vmessRowToBase64Uri(data as VmessRow, ps)
            case 'vless':
                return vlessRowToBase64Uri(data as VlessRow, ps)
            case 'ss':
                return ssRowToBase64Uri(data as SsRow, ps)
            case 'trojan':
                return trojanRowToBase64Uri(data as TrojanRow, ps)
            default:
                log.error("Unknown server type:", type)
                return ''
        }
    } catch (e) {
        log.error("Error converting server row to Base64 URI:", e)
        return ''
    }
}

function cleanData(data: any): any {
    const result: any = {}
    for (const key in data) {
        if (data[key]) result[key] = data[key]
    }
    return result
}

function vmessRowToBase64Uri(row: VmessRow, ps: string): string {
    const data = cleanData({ps, v: 2, ...row})
    if ("tls" in data) {
        data.tls = 'tls'
    } else {
        // 如果没开启 TLS，相关参数不分享
        if ("alpn" in data) delete data.alpn
        if ("fp" in data) delete data.fp
    }
    return `vmess://${encodeBase64(safeJsonStringify(data))}`
}

function vlessRowToBase64Uri(row: VlessRow, ps: string): string {
    const data = cleanData({ps, ...row})
    return `vless://${encodeBase64(safeJsonStringify(data))}`
}

function ssRowToBase64Uri(row: SsRow, ps: string): string {
    const data = cleanData({ps, ...row})
    return `ss://${encodeBase64(safeJsonStringify(data))}`
}

function trojanRowToBase64Uri(row: TrojanRow, ps: string): string {
    const data = cleanData({ps, ...row})
    return `trojan://${encodeBase64(safeJsonStringify(data))}`
}

