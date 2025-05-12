export function dnsToConf(dnsConfig: DnsConfig, dnsModeList: DnsModeList): any {
    if (!dnsConfig.enable) return {}
    const row = dnsModeList[dnsConfig.mode]
    if (row) {
        return {dns: dnsModeToConf(row)}
    }
    return {}
}

export function dnsModeToConf(row: DnsModeRow) {
    const dns: any = {}
    dns.tag = 'doay-dns'
    if (Array.isArray(row.hosts) && row.hosts.length > 0) {
        const hosts: any = {}
        for (const item of row.hosts) {
            hosts[item.domain] = item.host.indexOf('\n') > -1 ? item.host.split('\n') : item.host
        }
        dns.hosts = hosts
    }

    let globalUseIP = false
    if (Array.isArray(row.servers) && row.servers.length > 0) {
        const servers: any[] = []
        for (const item of row.servers) {
            if (item.type === 'address') {
                servers.push(item.address)
            } else {
                const obj: any = {}
                obj.address = item.address
                if (item.port && item.port !== 53) obj.address = Number(item.port)
                if (item.domains) obj.domains = item.domains.split('\n')
                if (item.expectIPs) obj.expectIPs = item.expectIPs.split('\n')
                if (item.clientIP) obj.clientIP = item.clientIP
                if (item.queryStrategy && item.queryStrategy !== 'UseIP') {
                    obj.queryStrategy = item.queryStrategy
                    if (['UseIPv4', 'UseIPv6'].indexOf(item.queryStrategy) > -1) globalUseIP = true
                }
                if (item.timeoutMs > 0 && item.timeoutMs !== 4000) obj.timeoutMs = Number(item.timeoutMs)
                if (item.skipFallback) obj.skipFallback = true
                if (item.allowUnexpectedIPs) obj.allowUnexpectedIPs = true
                servers.push(obj)
            }
        }
        dns.servers = servers
    }

    if (globalUseIP) row.queryStrategy = 'UseIP'

    if (row.clientIP) dns.clientIP = row.clientIP
    if (row.queryStrategy && row.queryStrategy !== 'UseIP') dns.queryStrategy = row.queryStrategy
    if (row.disableCache) dns.disableCache = true
    if (row.disableFallback) dns.disableFallback = true
    if (row.disableFallbackIfMatch) dns.disableFallbackIfMatch = true

    return dns
}
