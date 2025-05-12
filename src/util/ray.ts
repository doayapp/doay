import { readRayConfig, restartRay, saveRayCommonConfig, saveRayConfig } from "./invoke.ts"
import { getStatsConf } from "./serverConf.ts"
import { ruleToConf } from "./rule.ts"
import { dnsModeToConf } from "./dns.ts"

export function getSocksConf(config: AppConfig, rayCommonConfig: RayCommonConfig) {
    return {
        tag: "socks-in",
        protocol: "socks",
        listen: config.ray_host,
        port: config.ray_socks_port,
        settings: {
            udp: rayCommonConfig.socks_udp,
        },
        sniffing: {
            enabled: rayCommonConfig.socks_sniffing,
            destOverride: rayCommonConfig.socks_sniffing_dest_override,
            // metadataOnly: false
        }
    }
}

export function getHttpConf(config: AppConfig) {
    return {
        tag: "http-in",
        protocol: "http",
        listen: config.ray_host,
        port: config.ray_http_port
    }
}

async function saveAndRestart(conf: any) {
    const ok = await saveRayConfig(conf)
    if (ok) {
        await restartRay()
    }
}

export async function saveRayRule(ruleConfig: RuleConfig, ruleDomain: RuleDomain, ruleModeList: RuleModeList) {
    const conf = await readRayConfig()
    if (conf) {
        const routing = ruleToConf(ruleConfig, ruleDomain, ruleModeList)
        await saveAndRestart({...conf, ...routing})
    }
}

export async function saveRayDns(dnsConfig: DnsConfig, dnsModeList: DnsModeList) {
    const conf = await readRayConfig()
    if (conf) {
        if (dnsConfig.enable) {
            const row = dnsModeList[dnsConfig.mode]
            if (row) conf.dns = dnsModeToConf(row)
        } else {
            delete conf.dns
        }
        await saveAndRestart(conf)
    }
}

export async function saveRayLogLevel(value: string, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (c.log) {
        c.log.loglevel = value
        await saveAndRestart(c)
    }
}

export async function saveRayStatsEnable(value: boolean, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c) return

    if (!value) {
        delete c.stats
        delete c.metrics
        delete c.policy
        // delete c?.policy?.system
    } else {
        c = {...c, ...getStatsConf(Number(rayCommonConfig.stats_port))}
    }
    await saveAndRestart(c)
}

export async function saveRayStatsPort(rayConfig: any, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)
    if (typeof rayConfig === 'object' && rayConfig?.metrics?.listen) {
        rayConfig.metrics.listen = "127.0.0.1:" + rayCommonConfig.stats_port
    }
    // rayConfig.metrics = {listen: "127.0.0.1:" + rayCommonConfig.stats_port}
    await saveAndRestart(rayConfig)
}

export async function saveRayHost(host: string) {
    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        if (c.inbounds[i].listen) {
            c.inbounds[i].listen = host
        }
    }
    await saveAndRestart(c)
}

export async function saveRaySocksPort(port: number) {
    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        if (c.inbounds[i].protocol === "socks") {
            c.inbounds[i].port = port
        }
    }
    await saveAndRestart(c)
}

export async function saveRayHttpPort(port: number) {
    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        if (c.inbounds[i].protocol === "http") {
            c.inbounds[i].port = port
        }
    }
    await saveAndRestart(c)
}

export async function saveRaySocksEnable(value: boolean, config: AppConfig, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    if (value) {
        c.inbounds.push(getSocksConf(config, rayCommonConfig))
    } else {
        c.inbounds = c.inbounds.filter((item: any) => item.protocol !== "socks")
    }
    await saveAndRestart(c)
}

export async function saveRayHttpEnable(value: boolean, config: AppConfig, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    if (value) {
        c.inbounds.push(getHttpConf(config))
    } else {
        c.inbounds = c.inbounds.filter((item: any) => item.protocol !== "http")
    }
    await saveAndRestart(c)
}

export async function saveRaySocksUdp(value: boolean, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        if (c.inbounds[i].protocol === "socks") {
            if (c.inbounds[i].settings && typeof c.inbounds[i].settings === 'object') {
                c.inbounds[i].settings.udp = value
            } else {
                c.inbounds[i].settings = {udp: value}
            }
            // break
        }
    }
    await saveAndRestart(c)
}

export async function saveRaySocksSniffing(value: boolean, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        const inbounds = c.inbounds[i]
        if (inbounds.protocol === "socks") {
            if (typeof inbounds.sniffing !== 'object') inbounds.sniffing = {}
            inbounds.sniffing.enabled = value
            inbounds.sniffing.destOverride = rayCommonConfig.socks_sniffing_dest_override
            // break
        }
    }
    await saveAndRestart(c)
}

export async function saveRaySocksDestOverride(value: string[], rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.inbounds || !Array.isArray(c.inbounds)) return

    for (let i = 0; i < c.inbounds.length; i++) {
        const inbounds = c.inbounds[i]
        if (inbounds.protocol === "socks") {
            if (typeof inbounds.sniffing !== 'object') inbounds.sniffing = {enabled: rayCommonConfig.socks_sniffing}
            inbounds.sniffing.destOverride = value
            // break
        }
    }
    await saveAndRestart(c)
}

export async function saveRayOutboundsMux(value: boolean, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.outbounds || !Array.isArray(c.outbounds)) return

    for (let i = 0; i < c.outbounds.length; i++) {
        const outbound = c.outbounds[i]
        if (outbound.tag === "proxy") {
            if (typeof outbound.mux === 'object') {
                outbound.mux.enabled = value
                outbound.mux.concurrency = rayCommonConfig.outbounds_concurrency
            } else {
                outbound.mux = {
                    enabled: value,
                    concurrency: rayCommonConfig.outbounds_concurrency
                }
            }
            c.outbounds[i] = outbound
        }
    }
    await saveAndRestart(c)
}

export async function saveRayOutboundsConcurrency(value: number, rayCommonConfig: RayCommonConfig) {
    await saveRayCommonConfig(rayCommonConfig)

    let c = await readRayConfig()
    if (!c || !c.outbounds || !Array.isArray(c.outbounds)) return

    for (let i = 0; i < c.outbounds.length; i++) {
        const outbound = c.outbounds[i]
        if (outbound.tag === "proxy") {
            if (typeof outbound.mux === 'object') {
                outbound.mux.concurrency = value
            } else {
                outbound.mux = {enabled: rayCommonConfig.outbounds_mux, concurrency: value}
            }
            c.outbounds[i] = outbound
        }
    }
    await saveAndRestart(c)
}
