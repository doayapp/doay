import { fetchGet, log, readServerList, saveServerList } from "./invoke.ts"
import { getNewServerList, getScy } from "./server.ts"
import { hashJson } from "./crypto.ts"
import { generateUniqueId } from "./util.ts"

export async function getSubscription(row: SubscriptionRow) {
    const r = await fetchGet(row.url, row.isProxy)
    if (r && r.ok) {
        if (row.isHtml) {
            await parseHtml(r.body, row.name)
        } else {
            try {
                const obj = JSON.parse(r.body)
                await parseJson(obj, row.name)
            } catch (err) {
                log.error(`${row.name}, failed to subscription parseJson:`, err)
            }
        }
    } else {
        log.error('Failed to fetch subscription: ' + row.url)
    }
}

async function parseHtml(s: string, name: string) {
    const uriRegex = /(?:vmess|vless|ss|trojan):\/\/[^\s"'<>]+/g
    const matches = s.match(uriRegex)
    if (!matches) return

    const mArr = [...new Set(matches)]
    const uriArr = []
    for (let uri of mArr) {
        uri = uri.replace(/&amp;/ig, '&')
        if (uri.length > 80) uriArr.push(uri)
    }
    if (!uriArr.length) return

    const input = uriArr.join('\n')
    const {newServerList, errNum, existNum, newNum} = await getNewServerList(input)
    log.info(`Update subscription "${name}" HTML: ${errNum} Errors, ${existNum} Exists, ${newNum} New`)
    if (newNum > 0) {
        const ok = await saveServerList(newServerList)
        if (!ok) {
            log.error('Save ServerList Failed!')
        }
    }
}

async function parseJson(obj: any, name: string) {
    if ("servers" in obj && Array.isArray(obj.servers)) {
        const {newServerList, errNum, existNum, newNum} = await getNewServerListBySub(obj.servers)
        log.info(`Update subscription "${name}" JSON: ${errNum} Errors, ${existNum} Exists, ${newNum} New`)
        if (newNum > 0) {
            const ok = await saveServerList(newServerList)
            if (!ok) {
                log.error('Save ServerList Failed!')
            }
        }
    } else {
        log.info(`Update subscription not support JSON format: ${name}`)
    }
}

async function getNewServerListBySub(servers: any) {
    let errNum = 0
    let existNum = 0
    let newNum = 0
    let newServerList: ServerList = []
    let serverList = await readServerList() || []
    for (let server of servers) {
        const row = await subToServerRow(server)
        if (!row) {
            errNum++
            continue
        }

        let isExist = serverList.some(v => v.hash === row.hash)
        if (isExist) {
            existNum++
            continue
        }

        isExist = newServerList.some(v => v.hash === row.hash)
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

async function subToServerRow(server: any): Promise<ServerRow | null> {
    if (server.type === 'vmess') {
        return subToVmessRow(server)
    } else if (server.type === 'vless') {
        return subToVlessRow(server)
    } else if (server.type === 'ss') {
        return subToSsRow(server)
    } else if (server.type === 'trojan') {
        return subToTrojanRow(server)
    } else {
        log.error("Unsupported protocol, type:", server.type)
        return null
    }
}

async function subToVmessRow(server: any): Promise<ServerRow> {
    let ps = server.name || ''
    let data: VmessRow = {
        add: server.server || '',
        port: Number(server.port) || '',
        id: server.uuid || server.id || '',
        aid: server.alterId || '0',

        net: server.network || 'raw',
        scy: server.cipher || 'auto',

        host: server?.["ws-opts"]?.host || '',
        path: server?.["ws-opts"]?.path || '',

        type: server.type || '',
        mode: server.mode || '',

        tls: Boolean(server.tls) || false,
        alpn: server.alpn || '',
        fp: server.fp || 'chrome'
    }

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

async function subToVlessRow(server: any): Promise<ServerRow> {
    let ps = server.name || ''
    let data: VlessRow = {
        add: server.server || '',
        port: Number(server.port) || '',
        id: server.uuid || server.id || '',

        net: server.network || 'raw',
        scy: server.cipher || 'none',

        host: server.host || '',
        path: server.path || '',

        mode: server.mode || '',
        extra: server.extra || '',

        alpn: server.alpn || '',
        fp: server.fp || '',

        flow: server.flow || '',

        pbk: server.pbk || '',
        sid: server.sid || '',
        spx: server.spx || ''
    }

    if (data.net === 'tcp') data.net = 'raw'

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

async function subToSsRow(server: any): Promise<ServerRow> {
    let ps = server.name || ''
    let data: SsRow = {
        add: server.server || '',
        port: Number(server.port) || 0,
        pwd: server.password || '',
        scy: server.cipher || '',
    }

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

async function subToTrojanRow(server: any): Promise<ServerRow> {
    let ps = server.name || ''
    let data: TrojanRow = {
        add: server.server || '',
        port: Number(server.port) || 0,
        pwd: server.password || '',

        net: server.network || '',
        scy: 'tls',

        host: server.host || '',
        path: server.path || '',
    }

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
