import { readAppConfig, readRuleConfig, readRuleDomain, saveProxyPac, saveAppConfig } from "./invoke.ts"
import { processLines } from "./util.ts"
import { DEFAULT_APP_CONFIG, DEFAULT_RULE_CONFIG, DEFAULT_RULE_DOMAIN } from "./config.ts"

export async function reloadProxyPAC() {
    const ruleConfig = (await readRuleConfig()) || DEFAULT_RULE_CONFIG
    const ruleDomain = (await readRuleDomain()) || DEFAULT_RULE_DOMAIN
    await updateProxyPAC(ruleConfig, ruleDomain, true)
}

// 更新 proxy.js 文件
export async function updateProxyPAC(ruleConfig: RuleConfig, ruleDomain: RuleDomain, isReset: boolean = true) {
    const config = (await readAppConfig()) || DEFAULT_APP_CONFIG
    if (config.auto_setup_pac) {
        const proxy = config.ray_host + ":" + config.ray_socks_port
        const proxyDomains = ruleDomain.proxy ? JSON.stringify(processLines(ruleDomain.proxy.toLowerCase()), null, '\t') : '[]'
        const directDomains = ruleDomain.direct ? JSON.stringify(processLines(ruleDomain.direct.toLowerCase()), null, '\t') : '[]'
        const rejectDomains = ruleDomain.reject ? JSON.stringify(processLines(ruleDomain.reject.toLowerCase()), null, '\t') : '[]'
        const s = generateProxyPAC(proxy, proxyDomains, directDomains, rejectDomains, ruleConfig.unmatchedStrategy === 'direct')
        await saveProxyPac(s)

        // 避免影响 PAC 规则，其他代理设置全部关闭
        if (config.auto_setup_socks) await saveAppConfig('set_auto_setup_socks', false)
        if (config.auto_setup_http) await saveAppConfig('set_auto_setup_http', false)
        if (config.auto_setup_https) await saveAppConfig('set_auto_setup_https', false)

        // 通知操作系统 PAC 文件已经更新，关闭再开启
        if (isReset) {
            await saveAppConfig('set_auto_setup_pac', false)
            setTimeout(() => saveAppConfig('set_auto_setup_pac', true), 200)
        }
    }
}

function generateProxyPAC(proxy: string, proxyDomains: string, directDomains: string, rejectDomains: string, isUnmatchedDirect: boolean = true) {
    return `
var proxy = 'SOCKS5 ${proxy}';

var proxyDomains = ${proxyDomains};

var directDomains = ${directDomains};

var rejectDomains = ${rejectDomains};

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(s) {
		return this.length >= s.length && this.lastIndexOf(s) === this.length - s.length;
	};
}

function isHostMatch(domains, host) {
	return domains.some(v => v === host || host.endsWith('.' + v));
}

function FindProxyForURL(url, host) {
	if (isHostMatch(proxyDomains, host)) return proxy;
	if (isHostMatch(directDomains, host)) return "DIRECT";
	if (isHostMatch(rejectDomains, host)) return "PROXY 0.0.0.0:80";
	return ${isUnmatchedDirect ? '"DIRECT"' : 'proxy'};
}
`
}
