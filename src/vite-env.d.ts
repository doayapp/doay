/// <reference types="vite/client" />

interface AppConfig {
    app_log_level: "none" | "error" | "warn" | "info" | "debug" | "trace";

    web_server_enable: boolean;
    web_server_host: string;
    web_server_port: number | "";

    ray_enable: boolean;
    ray_host: string;
    ray_socks_port: number | "";
    ray_http_port: number | "";

    auto_setup_pac: boolean;
    auto_setup_socks: boolean;
    auto_setup_http: boolean;
    auto_setup_https: boolean;
}

interface RayCommonConfig {
    ray_log_level: "debug" | "info" | "warning" | "error" | "none";

    stats_enable: boolean; // 是否启用流量统计功能
    stats_port: number | "";

    socks_enable: boolean;
    http_enable: boolean;

    socks_udp: boolean;
    socks_sniffing: boolean;
    socks_sniffing_dest_override: ("http" | "tls" | "quic" | "fakedns" | "fakedns+others")[];

    outbounds_mux: boolean;
    outbounds_concurrency: number;
}

interface NavProps {
    setNavState?: any;
}

// ============= Log =============
interface LogRow {
    filename: string;
    last_modified: string;
    size: number;
}

type LogList = LogRow[];

interface LogContent {
    content: string;
    start: number;
    end: number;
    size: number;
}

interface PrevLogContent {
    fileSize: number;
    start: number;
    end: number;
    len: number;
}

// ============= server =============
interface ServerRow {
    id: string;
    ps: string; // 附言 postscript / 服务器备注 remark
    on: 0 | 1; // 是否启用 0: 未启用 1: 启用
    host: string; // 主机名+端口 如：example.com:8080
    type: string; // 类型 vless / vmess / ss / trojan
    scy: string; // 安全类型 security
    hash: string; // data JSON 字符串的哈希值，用来排重
    data: VmessRow | VlessRow | SsRow | TrojanRow | null;
}

type ServerList = ServerRow[];

/**
 * 设计宗旨：做减法（挺难的一件事，哪些参数可以砍掉？雷同的参数是否可合并？砍掉和合并后有什么利弊？）
 *
 * VMess / VLESS 分享链接提案: https://github.com/XTLS/Xray-core/discussions/716
 * 传输方式（配置总汇） https://xtls.github.io/config/transport.html
 *
 * https://xtls.github.io/config/outbounds/vmess.html
 * https://www.v2fly.org/v5/config/proxy/vmess.html
 */
interface VmessRow {
    add: string; // 地址 address 如：IP / 域名
    port: number | ''; // 端口 port
    id: string; // 用户 ID (uuid)
    aid: string; // 用户副 ID / 额外 ID (alterId) 默认: "0"

    /**
     * 精简 vmess & vless 配置，将 vmess 和 vless 参数进行拆分，xhttp 部分拆离 vmess
     * 当前的取值必须为 tcp、kcp、ws、http、grpc、httpupgrade、xhttp 其中之一
     * 分别对应 RAW、mKCP、WebSocket、HTTP 2/3、gRPC、HTTPUpgrade、XHTTP 传输方式
     **/
    net: string; // 网络传输方式 network 如: raw、kcp、ws、http、grpc、httpupgrade
    scy: string; // 安全类型 security = encryption 如：none / auto / zero / aes-128-gcm / chacha20-poly1305

    host: string; // 伪装域名 host
    path: string; // 伪装路径 path / 伪装主机名 serviceName / mKCP 种子 seed

    // raw 伪装类型 headerType 如：none / http
    // mKCP 伪装类型 headerType 如：none / srtp / utp / wechat-video / dtls / wireguard
    type: string;

    // gRPC
    mode: string; // gRPC 传输模式 transport mode 如：gun / multi

    // TLS
    // https://xtls.github.io/config/transport.html#tlsobject
    // ALPN = TLS ALPN（Application-Layer Protocol Negotiation，应用层协议协商，TLS 的扩展）
    tls: boolean; // TLS（Transport Layer Security，传输层安全协议）是否启用
    alpn: string; // TLS ALPN 协议，多个 ALPN 之间用英文逗号隔开，中间无空格
    fp: string; //  TLS 伪装指纹 fingerprint，TLS Client Hello 指纹 如：chrome / firefox / safari / edge / ios / android / random
}

// https://xtls.github.io/config/outbounds/vless.html
// https://www.v2fly.org/v5/config/proxy/vless.html
interface VlessRow {
    add: string; // 地址 address 如：IP / 域名
    port: number | ''; // 端口 port
    id: string; // 用户 ID (uuid)

    net: string; // 网络传输方式 network 如：raw / ws / grpc / xhttp
    scy: string; // 安全类型 security 如: none / tls / reality

    host: string; // 伪装域名 host
    path: string; // (ws / xhttp) 伪装路径 path / (grpc / reality) 伪装主机名 SNI = Server Name Indication 如：example.com

    // gRPC 传输模式 transport mode 如：gun / multi
    // XHTTP 传输模式 transport mode 如：auto / packet-up / stream-up / stream-one
    mode: string;

    // XHTTP
    // https://github.com/XTLS/Xray-core/discussions/4113
    extra: string; // XHTTP 额外参数 extra https://github.com/XTLS/Xray-core/pull/4000

    // TLS
    // https://xtls.github.io/config/transport.html#tlsobject
    alpn: string; // TLS ALPN 协议，多个 ALPN 之间用英文逗号隔开，中间无空格
    fp: string; //  TLS 伪装指纹 fingerprint，TLS Client Hello 指纹 如：chrome / firefox / safari / edge / ios / android / random

    // XTLS
    flow: string; // XTLS 流控模式 如：xtls-rprx-vision / xtls-rprx-vision-udp443

    // REALITY
    // https://xtls.github.io/config/transport.html#realityobject
    // https://github.com/XTLS/REALITY
    pbk: string; // public key 服务端私钥对应的公钥
    sid: string; // shortId 服务端 shortIds 之一
    spx: string; // spiderX 伪装爬虫初始路径与参数，建议每个客户端不同
}

interface SsRow {
    add: string; // 地址 address 如：IP / 域名
    port: number | ''; // 端口 port
    pwd: string; // 密码 password
    scy: string; // 安全类型 security = 加密方式 method
}

interface TrojanRow {
    add: string; // 地址 address 如：IP / 域名
    port: number | ''; // 端口 port
    pwd: string; // 密码 password

    net: string; // 网络传输方式 network 如：ws / grpc
    scy: string; // 安全类型 security 仅有：tls = "Transport Layer Security"（传输层安全协议）

    host: string; // 伪装域名 host
    path: string; // (ws) 伪装路径 path / (grpc) 伪装主机名 SNI = Server Name Indication 如：example.com
}

// ============= subscription =============
interface SubscriptionRow {
    name: string; // 订阅名称
    note: string; // 订阅描述
    hash: string; // JSON 字符串的哈希值，用来排重
    url: string; // 订阅 URL
    // updateCount: number; // 最后更新数量
    // lastUpdate: number; // 最后更新时间
    autoUpdate: boolean; // 是否开启自动更新
    isProxy: boolean; // 是否使用代理更新订阅
    isHtml: boolean; // 是否为 HTML 页面，如果为 HTML 页面，程序使用正则自动获取页面中的分享链接
}

type SubscriptionList = SubscriptionRow[];

// ============= rule =============
interface RuleConfig {
    globalProxy: boolean; // 是否全局代理
    unmatchedStrategy: string; // 未匹配到的域名访问方式 如：proxy / direct
    mode: number; // 采用模式 如: 0 / 1 / 2
}

interface RuleDomain {
    proxy: string; // 通过代理访问的域名，每行一条
    direct: string; // 直接访问的域名，每行一条
    reject: string; // 阻止访问的域名，每行一条
}

// ============= speed test =============
interface SpeedTestConfig {
    ipTestActive: number;
    pingActive: number;
    downloadActive: number;
    uploadActive: number;

    ipTestContent: string;
    pingContent: string;
    downloadContent: string;
    uploadContent: string;
}

// https://xtls.github.io/config/routing.html#ruleobject
// https://www.v2fly.org/config/routing.html#ruleobject
/**
 * {
 *   "domainMatcher": "hybrid",
 *   "type": "field",
 *   "domain": ["baidu.com", "qq.com", "geosite:cn"],
 *   "ip": ["0.0.0.0/8", "10.0.0.0/8", "fc00::/7", "fe80::/10", "geoip:cn"],
 *   "port": "53,443,1000-2000",
 *   "sourcePort": "53,443,1000-2000",
 *   "network": "tcp",
 *   "source": ["10.0.0.1"],
 *   "user": ["love@xray.com"],
 *   "inboundTag": ["tag-vmess"],
 *   "protocol": ["http", "tls", "quic", "bittorrent"],
 *   "attrs": { ":method": "GET" },
 *   "outboundTag": "direct",
 *   "balancerTag": "balancer",
 *   "ruleTag": "rule name"
 * }
 */
interface RuleRow {
    name: string; // 规则名称
    note: string; // 规则描述
    outboundTag: string; // 访问方式，对应出站连接配置的标识 如: proxy / direct / reject
    ruleType: string; // 规则类型 如: domain / ip / multi (多维规则)
    domain: string; // 域名
    ip: string; // 目标 IP
    port: string; // 目标端口
    // source: string; // 来源 IP （需求少，不实现）
    sourcePort: string; // 来源端口
    network: string; // 传输协议
    // user: string; // 用户邮箱地址（无聊的设计，砍掉）
    // inboundTag: string; // 入站连接标识（需求少，不实现）
    protocol: string; // 请求协议
    // attrs: string; // 请求流量属性（需求少，不实现）
    // balancerTag: string; // 负载均衡器标识（需求少，不实现）
    // ruleTag: string;
}

interface RuleModeRow {
    name: string; // 模式名称
    note: string; // 模式描述
    domainStrategy: string; // 域名匹配策略 如：AsIs / IPIfNonMatch / IPOnDemand
    hash: string; // rules JSON 字符串的哈希值，用来排重
    rules: RuleRow[]; // 路由规则具体内容
}

type RuleModeList = RuleModeRow[];

// ============= DNS ============
interface DnsConfig {
    enable: boolean; // 启用内置 DNS 服务器，不启用则使用操作系统设置的 DNS 服务器
    mode: number; // 采用模式 如: 0 / 1 / 2
}

// https://xtls.github.io/config/dns.html#dnsobject
interface DnsHostRow {
    name: string; // DNS 地址表名称
    note: string; // DNS 地址表描述
    domain: string; // DNS 域名
    host: string; // DNS 地址，如: IP 或 域名
}

// https://xtls.github.io/config/dns.html#dnsserverobject
interface DnsServerRow {
    name: string; // DNS 服务器名称
    note: string; // DNS 服务器描述
    type: string; // DNS 服务器类型 如: address | object
    // tag: string; // 标签
    address: string; // DNS 服务器地址
    port: number | ''; // DNS 服务器端口
    domains: string; // 域名列表
    expectIPs: string; // 验证 IP 范围列表
    clientIP: string; // 客户端 IP 地址，用于 DNS 查询时通知服务器的公网 IP 地址
    queryStrategy: string; // DNS 查询策略 参数：UseIP | UseIPv4 | UseIPv6，默认值: UseIP
    timeoutMs: number; // 查询超时时间，默认 4000 ms
    skipFallback: boolean; // 跳过 DNS fallback 查询，默认 false 不跳过（等同 disableFallback）
    allowUnexpectedIPs: boolean; // 是否允许意外 IP 范围列表，默认 false 不允许
}

// https://xtls.github.io/config/dns.html#dnsobject
interface DnsModeRow {
    name: string; // 模式名称
    note: string; // 模式描述
    // tag: string; // 标签（此为全局默认值，DnsServer 没设置时使用此值）
    hash: string; // JSON 字符串的哈希值，用来排重
    hosts: DnsHostRow[]; // DNS 服务器静态 IP 列表，减少解析请求，提升解析效率
    servers: DnsServerRow[]; // DNS 服务器
    clientIP: string; // 客户端 IP 地址，用于 DNS 查询时通知服务器的公网 IP 地址（此为全局默认值，DnsServer 没设置时使用此值）
    queryStrategy: string; // DNS 查询策略 参数：UseIP | UseIPv4 | UseIPv6，默认值: UseIP（此为全局默认值，DnsServer 没设置时使用此值）
    disableCache: boolean; // 禁用 DNS 缓存，默认 false 不禁用
    disableFallback: boolean; // 禁用 DNS fallback 查询，默认 false 不禁用
    disableFallbackIfMatch: boolean; // 优先匹配域名列表命中时，是否禁用 DNS fallback 查询，默认 false 不禁用
}

type DnsModeList = DnsModeRow[];

interface DnsTableRow {
    name: string; // 名称
    note: string; // 描述
    hash: string; // JSON 字符串的哈希值，用来排重
    IPv4: string; // IPv4 地址
    IPv6: string; // IPv6 地址
    DoH: string; // DNS over HTTPS (DoH) 通过 HTTPS 协议加密进行 DNS 查询
    DoT: string; // DNS over TLS (DoT)，通过 TLS 协议加密进行 DNS 查询
}

type DnsTableList = DnsTableRow[];

/*interface Tauri {
    app: {
        defaultWindowIcon(): Promise<Image | null>;
        getName(): Promise<string>;
        getVersion(): Promise<string>;
        getTauriVersion(): Promise<string>;
        hide(): Promise<void>;
        show(): Promise<void>;
        setTheme(theme?: string): Promise<void>;
    };
    core: {
        invoke(cmd: string, args?: Record<string, any>, options?: Record<string, any>): Promise<void>;
        isTauri(): boolean;
    }
    dpi: any;
    event: {
        emit(event: string, payload?: any): Promise<void>;
        emitTo(target: string, event: string, payload?: any): Promise<void>;
        listen(event: string, handler: any): Promise<void>;
        once(event: string, handler: any): Promise<void>;
    };
    image: any;
    menu: any;
    mocks: any;
    path: any;
    tray: any;
    webview: any;
    webviewWindow: any;
    window: {
        cursorPosition(): Promise<void>;
        getAllWindows(): Promise<void>;
        getCurrentWindow(): any;
    };
}

interface Window {
    __TAURI__: Tauri;
}*/
