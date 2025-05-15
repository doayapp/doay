import { invoke, isTauri } from '@tauri-apps/api/core'

export const IS_TAURI = isTauri()
export const log = {
    error: (message: string, ...args: any[]) => {
        console.log(`[ERROR] ${message}`, ...args)
        sendLog(`[ERROR] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`)
    },
    warn: (message: string, ...args: any[]) => {
        console.log(`[WARN] ${message}`, ...args)
        sendLog(`[WARN] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`)
    },
    info: (message: string, ...args: any[]) => {
        console.log(`[INFO] ${message}`, ...args)
        sendLog(`[INFO] ${message} ${args.map(arg => JSON.stringify(arg)).join(' ')}`)
    },
}

// window?.__TAURI__?.core // 全局变量，增加了安全性风险，性能影响，页面加载变慢
function sendLog(content: string) {
    safeInvoke('send_log', {content}).catch(_ => 0)
}

export async function safeInvoke(apiName: string, options: any = {}) {
    if (!IS_TAURI) return
    try {
        return invoke(apiName, options) as any
    } catch (err) {
        log.error('Failed to invoke:', err)
        return
    }
}

export function jsonStringify(data: any): string {
    try {
        return JSON.stringify(data, null, 2)
    } catch (e) {
        log.error('JSON.stringify failed:', e)
        return '{}'
    }
}

export async function invokeBool(apiName: string, options: any = {}) {
    return Boolean(await safeInvoke(apiName, options))
}

export async function invokeString(apiName: string, options: any = {}) {
    return String(await safeInvoke(apiName, options))
}

export async function getDoayAppDir(): Promise<string> {
    return invokeString('get_doay_app_dir')
}

export function restartRay() {
    return invokeBool('restart_ray')
}

export async function checkPortAvailable(port: number) {
    return invokeBool('check_port_available', {port})
}

export async function startSpeedTestServer(port: number, filename: string) {
    return invokeBool('start_speed_test_server', {port, filename})
}

export async function stopSpeedTestServer(port: number) {
    return invokeBool('stop_speed_test_server', {port})
}

export async function readAppConfig(): Promise<AppConfig | undefined> {
    return safeInvoke('get_config_json')
}

export async function saveAppConfig(cmd: string, value: string | number | boolean) {
    return invokeBool(cmd, {value})
}

export async function readRayConfig(): Promise<any> {
    return safeInvoke('read_ray_config')
}

export async function appElapsed() {
    return safeInvoke('app_elapsed')
}

export async function isQuietMode() {
    return invokeBool('is_quiet_mode')
}

export async function saveRayConfig(content: any) {
    return invokeBool('save_ray_config', {content: jsonStringify(content)})
}

export async function saveProxyPac(content: string) {
    return invokeBool('save_proxy_pac', {content})
}

export async function saveTextFile(path: string, content: string) {
    return invokeBool('save_text_file', {path, content})
}

export async function openWebServerDir() {
    return invokeBool('open_web_server_dir')
}

export async function clearLogAll() {
    return invokeBool('clear_log_all')
}

export async function readLogList(): Promise<LogList | undefined> {
    return safeInvoke('read_log_list')
}

export async function readLogFile(filename: string, reverse: boolean = true, start: number = -1): Promise<LogContent | undefined> {
    return safeInvoke('read_log_file', {filename, reverse, start})
}

async function readConf(filename: string) {
    return safeInvoke('read_conf', {filename})
}

async function saveConf(filename: string, content: any) {
    return invokeBool('save_conf', {filename, content: jsonStringify(content)})
}

export async function saveSpeedTestConf(filename: string, content: any) {
    return invokeBool('save_speed_test_conf', {filename, content: jsonStringify(content)})
}

export async function readRayCommonConfig(): Promise<RayCommonConfig | undefined> {
    return readConf('ray_common_config.json')
}

export async function saveRayCommonConfig(content: RayCommonConfig) {
    return saveConf('ray_common_config.json', content)
}

export async function readServerList(): Promise<ServerList | undefined> {
    return readConf('server.json')
}

export async function saveServerList(content: ServerList) {
    return saveConf('server.json', content)
}

export async function readSubscriptionList(): Promise<SubscriptionList | undefined> {
    return readConf('subscription.json')
}

export async function saveSubscriptionList(content: SubscriptionList) {
    return saveConf('subscription.json', content)
}

export async function readRuleConfig(): Promise<RuleConfig | undefined> {
    return readConf('rule_config.json')
}

export async function saveRuleConfig(content: RuleConfig) {
    return saveConf('rule_config.json', content)
}

export async function readRuleDomain(): Promise<RuleDomain | undefined> {
    return readConf('rule_domain.json')
}

export async function saveRuleDomain(content: RuleDomain) {
    return saveConf('rule_domain.json', content)
}

export async function readRuleModeList(): Promise<RuleModeList | undefined> {
    return readConf('rule_mode_list.json')
}

export async function saveRuleModeList(content: RuleModeList) {
    return saveConf('rule_mode_list.json', content)
}

export async function readDnsConfig(): Promise<DnsConfig | undefined> {
    return readConf('dns_config.json')
}

export async function saveDnsConfig(content: DnsConfig) {
    return saveConf('dns_config.json', content)
}

export async function readDnsModeList(): Promise<DnsModeList | undefined> {
    return readConf('dns_mode_list.json')
}

export async function saveDnsModeList(content: DnsModeList) {
    return saveConf('dns_mode_list.json', content)
}

export async function readDnsTableList(): Promise<DnsTableList | undefined> {
    return readConf('dns_table_list.json')
}

export async function saveDnsTableList(content: DnsTableList) {
    return saveConf('dns_table_list.json', content)
}

export async function readSpeedTestConfig(): Promise<SpeedTestConfig | undefined> {
    return readConf('speed_test_config.json')
}

export async function saveSpeedTestConfig(content: SpeedTestConfig) {
    return saveConf('speed_test_config.json', content)
}

export async function getSysInfoJson() {
    return safeInvoke('get_sys_info_json')
}

export async function getLoadAverageJson() {
    return safeInvoke('get_load_average_json')
}

export async function getProcessesJson(keyword: string) {
    return safeInvoke('get_processes_json', {keyword})
}

export async function getDisksJson() {
    return safeInvoke('get_disks_json')
}

export async function getNetworksJson() {
    return safeInvoke('get_networks_json')
}

export async function getComponentsJson() {
    return safeInvoke('get_components_json')
}

export async function killProcessByPid(pid: number) {
    return invokeBool('kill_process_by_pid', {pid})
}

export async function downloadLargeFile(url: string, filepath: string, proxyUrl: string, userAgent: string, timeout: number = 60 * 30) {
    return safeInvoke('download_large_file', {url, filepath, proxyUrl, userAgent, timeout})
}

export async function pingTest(url: string, proxyUrl: string, userAgent: string, count: number, timeout: number = 10) {
    return safeInvoke('ping_test', {url, proxyUrl, userAgent, count, timeout})
}

export async function jitterTest(url: string, proxyUrl: string, userAgent: string, count: number, timeout: number = 10) {
    return safeInvoke('jitter_test', {url, proxyUrl, userAgent, count, timeout})
}

export async function downloadSpeedTest(url: string, proxyUrl: string, userAgent: string, timeout: number = 60 * 20) {
    return safeInvoke('download_speed_test', {url, proxyUrl, userAgent, timeout})
}

export async function uploadSpeedTest(url: string, proxyUrl: string, userAgent: string, size: number, timeout: number = 60 * 10) {
    return safeInvoke('upload_speed_test', {url, proxyUrl, userAgent, size, timeout})
}

export async function fetchResponseHeaders(url: string, proxyUrl: string, userAgent: string = navigator.userAgent, timeout: number = 10) {
    return safeInvoke('fetch_response_headers', {url, proxyUrl, userAgent, timeout})
}

export async function fetchTextContent(url: string, proxyUrl: string, userAgent: string = navigator.userAgent, timeout: number = 10) {
    return safeInvoke('fetch_text_content', {url, proxyUrl, userAgent, timeout})
}

export async function fetchGet(url: string, isProxy: boolean = false, userAgent: string = navigator.userAgent, timeout: number = 10) {
    return safeInvoke('fetch_get', {url, isProxy, userAgent, timeout})
}

export async function startScanPorts(host: string, startPort: number, endPort: number, maxThreads: number, timeoutMs: number = 500) {
    return safeInvoke('start_scan_ports', {host, startPort, endPort, maxThreads, timeoutMs})
}

export async function readOpenLog() {
    return invokeString('read_open_log')
}

export async function readTimeoutLog() {
    return invokeString('read_timeout_log')
}

export async function readRefusedLog() {
    return invokeString('read_refused_log')
}
