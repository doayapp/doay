import { log } from "./invoke.ts"
import { getSocksConf, getHttpConf } from "./ray.ts"

export function getConf(row: ServerRow, appDir: string, config: AppConfig, rayConfig: RayCommonConfig) {
    let conf: any = {}
    conf.log = getLogConf(appDir, rayConfig)
    conf.inbounds = getInboundsConf(config, rayConfig)
    conf.outbounds = getOutboundsConf(row, rayConfig)
    if (rayConfig.stats_enable) conf = {...conf, ...getStatsConf(Number(rayConfig.stats_port))}
    return conf
}

export function getSpeedTestConf(row: ServerRow, appDir: string, rayConfig: RayCommonConfig, port: number): any {
    return {
        log: !appDir ? {} : {
            loglevel: rayConfig.ray_log_level || "warning",
            access: `${appDir}/logs/xray_speed_test_access.log`,
            error: `${appDir}/logs/xray_speed_test_error.log`
        },
        inbounds: [
            {
                tag: "socks-test-in",
                protocol: "socks",
                listen: "127.0.0.1",
                port: port,
            }
        ],
        outbounds: [serverRowToConf(row) || {}]
    }
}

export function getLogConf(appDir: string, rayConfig: RayCommonConfig) {
    let obj: any = {}
    obj.loglevel = rayConfig.ray_log_level || "warning"
    if (appDir) {
        obj.access = `${appDir}/logs/xray_access.log`
        obj.error = `${appDir}/logs/xray_error.log`
    }
    return obj
}

export function getInboundsConf(config: AppConfig, rayConfig: RayCommonConfig) {
    let arr = []
    arr.push(getSocksConf(config, rayConfig))
    if (rayConfig.http_enable) arr.push(getHttpConf(config))
    return arr
}

export function getOutboundsConf(row: ServerRow, rayConfig: RayCommonConfig) {
    const proxy = serverRowToConf(row)
    proxy.mux = {
        enabled: rayConfig.outbounds_mux,
        concurrency: rayConfig.outbounds_concurrency
    }
    return [
        proxy,
        {
            tag: "direct",
            protocol: "freedom"
        },
        {
            tag: "reject",
            protocol: "blackhole"
        }
    ]
}

export function getStatsConf(statsPort: number) {
    return {
        // https://xtls.github.io/config/stats.html
        "stats": {},

        // 这种设计适合 API 调用，但包含冗余数据。建议 xray 官方，通过参数控制返回的数据，减少不必要的信息。
        // 空了看一下 xray 源码，这种需求比较容易实现
        // 命令行 curl http://127.0.0.1:11111/debug/vars
        // https://xtls.github.io/config/metrics.html
        "metrics": {
            // "tag": "Metrics",
            "listen": "127.0.0.1:" + statsPort
        },

        // https://xtls.github.io/config/policy.html
        "policy": {
            "system": {
                "statsInboundUplink": true,
                "statsInboundDownlink": true,
                "statsOutboundUplink": true,
                "statsOutboundDownlink": true
            }
        },

        // 这种设计，适合命令行查看，不太适合 API 调用后使用，里面的 name 设计的太长，需要自行处理
        // 命令行 ./xray api statsquery --server=127.0.0.1:11112
        // https://xtls.github.io/config/api.html#%E7%9B%B8%E5%85%B3%E9%85%8D%E7%BD%AE
        // https://xtls.github.io/config/api.html#%E6%94%AF%E6%8C%81%E7%9A%84-api-%E5%88%97%E8%A1%A8
        // https://www.v2fly.org/config/api.html#%E6%94%AF%E6%8C%81%E7%9A%84-api-%E5%88%97%E8%A1%A8
        /*"api": {
            "tag": "api",
            "listen": "127.0.0.1:11112",
            "services": [
                "HandlerService",
                // "RoutingService",
                "LoggerService",
                "StatsService"
            ]
        },*/
    }
}

export function serverRowToConf(row: ServerRow): any {
    const {type, data} = row
    switch (type) {
        case 'vmess':
            return vmessRowToConf(data as VmessRow)
        case 'vless':
            return vlessRowToConf(data as VlessRow)
        case 'ss':
            return ssRowToConf(data as SsRow)
        case 'trojan':
            return trojanRowToConf(data as TrojanRow)
        default:
            log.error("Unknown server type:", type)
            return null
    }
}

function vmessRowToConf(row: VmessRow): any {
    let settings = {}
    if (row.tls) {
        settings = {...settings, tlsSettings: getTlsSettings(row)}
    }

    // https://xtls.github.io/config/transport.html
    if (row.net === 'raw') {
        if (row.type === 'http') settings = {...settings, tcpSettings: getHttpHeader()}
    } else if (row.net === 'kcp') {
        settings = {...settings, kcpSettings: getKcpSettings(row)}
    } else if (row.net === 'grpc') {
        settings = {...settings, grpcSettings: getGrpcSettings(row, row.mode === 'multi')}
    } else if (row.net === 'ws') {
        settings = {...settings, wsSettings: getWsSettings(row)}
    } else if (row.net === 'http') {
        settings = {...settings, wsSettings: getHttpSettings(row)}
    } else if (row.net === 'httpupgrade') {
        settings = {...settings, httpupgradeSettings: getHttpUpgradeSettings(row)}
    }

    // https://xtls.github.io/config/inbounds/vmess.html
    // https://www.v2fly.org/config/protocols/vmess.html#outboundconfigurationobject
    // https://www.v2fly.org/v5/config/proxy/vmess.html#vmess-%E5%87%BA%E7%AB%99
    return {
        tag: "proxy",
        protocol: "vmess",
        settings: {
            vnext: [
                {
                    address: row.add || '',
                    port: row.port || '',
                    users: [
                        {
                            id: row.id || '',
                            alterId: row.aid || '0',
                            security: row.scy || 'auto'
                        }
                    ]
                }
            ]
        },
        streamSettings: {
            network: row.net || '',
            ...settings
        }
    }
}

function vlessRowToConf(row: VlessRow): any {
    let settings = {}
    if (row.scy && row.scy !== 'none') {
        settings = {...settings, tlsSettings: getTlsSettings(row)}
    }

    if (row.scy === 'reality') {
        settings = {...settings, realitySettings: getRealitySettings(row)}
    }

    if (row.net === 'ws') {
        settings = {...settings, wsSettings: getWsSettings(row)}
    } else if (row.net === 'grpc') {
        settings = {...settings, grpcSettings: getGrpcSettings(row, row.mode === 'multi')}
    } else if (row.net === 'xhttp') {
        settings = {...settings, xhttpSettings: getXhttpSettings(row)}
    }

    // PS: 这个配置设计真的乱，单独设计一个 xtlsSettings 不含义更明确？
    let flowSettings = {}
    if (row.flow) {
        flowSettings = {flow: row.flow}
    }

    // https://xtls.github.io/config/inbounds/vless.html#clientobject
    // https://www.v2fly.org/config/protocols/vless.html#outboundconfigurationobject
    // https://www.v2fly.org/v5/config/proxy/vless.html
    return {
        tag: "proxy",
        protocol: "vless",
        settings: {
            vnext: [
                {
                    address: row.add || '',
                    port: row.port || '',
                    users: [
                        {
                            id: row.id || '',
                            encryption: "none",
                            ...flowSettings
                        }
                    ]
                }
            ]
        },
        streamSettings: {
            network: row.net || '',
            security: row.scy || 'none',
            ...settings
        }
    }
}

function ssRowToConf(row: SsRow): any {
    return {
        tag: "proxy",
        protocol: "shadowsocks",
        settings: {
            servers: [
                {
                    address: row.add || '',
                    port: row.port || '',
                    method: row.scy || '',
                    password: row.pwd || '',
                }
            ]
        }
    }
}

function trojanRowToConf(row: TrojanRow): any {
    let settings = {}
    if (row.net === 'ws') {
        settings = {wsSettings: getWsSettings(row)}
    } else if (row.net === 'grpc') {
        settings = {grpcSettings: getGrpcSettings(row)}
    }

    return {
        tag: "proxy",
        protocol: "trojan",
        settings: {
            servers: [
                {
                    address: row.add || '',
                    port: row.port || '',
                    password: row.pwd || ''
                }
            ]
        },
        streamSettings: {
            network: row.net || '',
            security: "tls",
            ...settings
        }
    }
}

// https://xtls.github.io/config/transports/raw.html#httpheaderobject
function getHttpHeader() {
    return {
        "header": {
            "type": "http",
            "request": {
                "version": "1.1",
                "method": "GET",
                "path": ["/"],
                "headers": {
                    "Host": ["www.baidu.com", "www.bing.com"],
                    "User-Agent": ["Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"],
                    "Accept-Encoding": ["gzip, deflate"],
                    "Connection": ["keep-alive"],
                    "Pragma": "no-cache"
                }
            }
        }
    }
}

// https://xtls.github.io/config/transports/mkcp.html
function getKcpSettings(row: VmessRow) {
    return {
        mtu: 1350,
        tti: 50,
        uplinkCapacity: 20,
        downlinkCapacity: 100,
        congestion: false,
        readBufferSize: 2,
        writeBufferSize: 2,
        header: {
            type: row.type || 'none',
            domain: row.host || '',
        },
        seed: row.path || '',
    }
}

// https://www.v2fly.org/config/transport/h2.html
function getHttpSettings(row: VmessRow) {
    return {
        path: row.path || '',
        host: [
            row.host || '',
        ]
    }
}

// https://xtls.github.io/config/transports/httpupgrade.html
function getHttpUpgradeSettings(row: VmessRow) {
    return {
        path: row.path || '',
        host: row.host || '',
    }
}

// https://xtls.github.io/config/transports/websocket.html
function getWsSettings(row: VmessRow | VlessRow | TrojanRow) {
    return {
        host: row.add || '',
        path: row.path || '',
        headers: {
            Host: row.host || row.add || ''
        }
    }
}

// PS: 设计的真乱，驼峰命名法 混着 蛇形命名法
// https://xtls.github.io/config/transports/grpc.html
// https://www.v2fly.org/config/transport/grpc.html
// https://www.v2fly.org/v5/config/stream/grpc.html
function getGrpcSettings(row: { host: string, path: string }, mode?: boolean) {
    return {
        authority: row.host || '',
        serviceName: row.path || '',
        multiMode: mode || false, // 实验性 选项，可能不会被长期保留。此模式在 测试环境中 能够带来约 20% 的性能提升
        idle_timeout: 60,
        permit_without_stream: false,
        initial_windows_size: 0
    }
}

// https://xtls.github.io/config/transports/xhttp.html
// https://github.com/XTLS/Xray-core/discussions/4113
function getXhttpSettings(row: VlessRow) {
    return {
        host: row.host || '',
        path: row.path || '',
        mode: row.mode || 'auto'
    }
}

// https://xtls.github.io/config/transport.html#tlsobject
function getTlsSettings(row: { host: string, alpn: string, fp: string }, allowInsecure?: boolean) {
    let settings: any = {}
    if (row.host) settings.serverName = row.host
    if (row.alpn) settings.alpn = parseAlpn(row.alpn)
    if (row.fp) settings.fingerprint = row.fp
    return {
        allowInsecure: allowInsecure ?? false, // 关闭证书检测非常危险，不建议开启，所以不考虑实现，实在有需求，直接修改配置文件即可
        ...settings
    }
}

function parseAlpn(alpn: string): string[] {
    return alpn.split(',').map(item => item.trim())
}

// https://xtls.github.io/config/transport.html#realityobject
// https://github.com/XTLS/REALITY
function getRealitySettings(row: VlessRow) {
    return {
        show: false,
        serverName: row.path || '',
        fingerprint: row.fp || '',
        publicKey: row.pbk || '',
        shortId: row.sid || '',
        spiderX: row.spx || ''
    }
}
