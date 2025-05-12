import { processLines } from "./util.ts"

export function ruleToConf(ruleConfig: RuleConfig, ruleDomain: RuleDomain, ruleModeList: RuleModeList): any {
    if (ruleConfig.globalProxy) return getGlobalProxyConf()

    let domainStrategy = ''
    let rules = [...ruleDomainToConf(ruleDomain)]

    // 采用的哪个模式
    if (Array.isArray(ruleModeList) && ruleModeList.length > 0) {
        const ruleMode = ruleModeList[ruleConfig.mode]
        if (ruleMode && Array.isArray(ruleMode.rules) && ruleMode.rules.length > 0) {
            domainStrategy = ruleMode.domainStrategy
            rules = [...rules, ...ruleModeToConf(ruleMode.rules)]
        }
    }

    // 未匹配策略，方便观察匹配上的哪个规则
    if (ruleConfig.unmatchedStrategy) {
        rules.push({
            type: 'field',
            ruleTag: 'doay-unmatched',
            outboundTag: ruleConfig.unmatchedStrategy,
            // network: 'tcp,udp',
            port: '1-65535',
        })
    }

    return {
        "routing": {
            "domainStrategy": domainStrategy || 'AsIs',
            "rules": rules
        }
    }
}

export function ruleModeToConf(row: RuleRow[]): any[] {
    let rules = []
    for (let i = 0; i < row.length; i++) {
        const v = row[i]
        let rule: any = {
            type: 'field',
            ruleTag: `${i + 1}-doay-mode-${v.outboundTag}`,
            outboundTag: v.outboundTag
        }
        if (v.ruleType === 'domain') {
            rules.push({...rule, domain: processLines(v.domain)})
        } else if (v.ruleType === 'ip') {
            rules.push({...rule, ip: processLines(v.ip)})
        } else if (v.ruleType === 'multi') {
            if (v.domain) rule.domain = processLines(v.domain)
            if (v.ip) rule.ip = processLines(v.ip)
            if (v.port) rule.port = processLines(v.port).join(',')
            if (v.sourcePort) rule.sourcePort = processLines(v.sourcePort).join(',')
            if (v.network) rule.network = v.network
            if (v.protocol) rule.protocol = processLines(v.protocol, ',')
            rules.push(rule)
        }
    }
    return rules
}

export function ruleDomainToConf(ruleDomain: RuleDomain): any[] {
    let rules = []

    if (ruleDomain.proxy) {
        rules.push({
            type: 'field',
            ruleTag: 'doay-domain-proxy',
            outboundTag: 'proxy',
            domain: processLines(ruleDomain.proxy),
        })
    }

    if (ruleDomain.direct) {
        rules.push({
            type: 'field',
            ruleTag: 'doay-domain-direct',
            outboundTag: 'direct',
            domain: processLines(ruleDomain.direct),
        })
    }

    if (ruleDomain.reject) {
        rules.push({
            type: 'field',
            ruleTag: 'doay-domain-reject',
            outboundTag: 'reject',
            domain: processLines(ruleDomain.reject),
        })
    }

    return rules
}

// 考虑用户体验，全局代理，排除代理服务器无法访问的 私有域名 和 私有IP
export function getGlobalProxyConf(): any {
    return {
        routing: {
            domainStrategy: "AsIs",
            rules: [{
                type: 'field',
                ruleTag: 'doay-global-proxy',
                outboundTag: 'direct',
                domain: ['geosite:private'],
                ip: ['geoip:private'],
            }]
        }
    }
}
