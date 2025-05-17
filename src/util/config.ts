export const DEFAULT_APP_CONFIG: AppConfig = {
    app_log_level: "info",

    web_server_enable: true,
    web_server_host: "127.0.0.1",
    web_server_port: 18687,

    ray_enable: false,
    ray_host: "127.0.0.1",
    ray_socks_port: 1086,
    ray_http_port: 1089,

    auto_setup_pac: false,
    auto_setup_socks: true,
    auto_setup_http: false,
    auto_setup_https: false
}

export const DEFAULT_RAY_COMMON_CONFIG: RayCommonConfig = {
    ray_log_level: "warning",

    stats_enable: false,
    stats_port: 18688,

    socks_enable: true,
    http_enable: true,

    socks_udp: true,
    socks_sniffing: true,
    socks_sniffing_dest_override: ["http", "tls"],

    outbounds_mux: false,
    outbounds_concurrency: 8,
}

export const DEFAULT_RULE_CONFIG: RuleConfig = {
    globalProxy: false,
    unmatchedStrategy: 'proxy',
    mode: 0
}

export const DEFAULT_RULE_DOMAIN: RuleDomain = {
    proxy: '',
    direct: '',
    reject: ''
}

// https://xtls.github.io/config/routing.html#ruleobject
// https://www.v2fly.org/config/routing.html#ruleobject
export const DEFAULT_RULE_ROW: RuleRow = {
    name: '',
    note: '',
    outboundTag: 'proxy',
    ruleType: 'domain',
    domain: '',
    ip: '',
    port: '',
    sourcePort: '',
    network: '',
    protocol: '',
}

export const DEFAULT_RULE_MODE_LIST: RuleModeList = [
    {
        "name": "中国大陆模式",
        "note": "专为中国大陆网络环境优化的访问规则",
        "domainStrategy": "IPIfNonMatch",
        "hash": "4bb4ab84e6886266c7633ecde57af1d025f1c1c69d0cdae4ed78788c1db402c5",
        "rules": [
            {
                "name": "中国大陆 DNS 服务器",
                "note": "直连中国大陆常用 DNS 服务器",
                "outboundTag": "direct",
                "ruleType": "multi",
                "domain": "domain:114dns.com\ndomain:360.cn\ndomain:alidns.com\ndomain:chinamobile.com\ndomain:chinatelecom.com.cn\ndomain:chinaunicom.com\ndomain:cnnic.cn\ndomain:dns.360.cn\ndomain:dns.alidns.com\ndomain:dns.baidu.com\ndomain:dnspod.cn\ndomain:dnspod.com\ndomain:doh.360.cn\ndomain:doh.pub\ndomain:dot.360.cn\ndomain:dot.pub\ndomain:onedns.net\ndomain:tsinghua.edu.cn",
                "ip": "1.12.12.12\n1.2.4.8\n101.226.4.6\n101.6.6.6\n114.114.114.110\n114.114.114.114\n114.114.114.119\n114.114.115.110\n114.114.115.115\n114.114.115.119\n117.50.22.22\n119.29.29.29\n123.125.81.6\n140.207.198.6\n180.76.76.76\n182.254.116.116\n2001:da8:202:10::36\n202.96.128.86\n202.96.134.33\n210.2.4.8\n211.136.192.6\n211.136.192.7\n218.30.118.6\n223.5.5.5\n223.6.6.6\n2400:3200::1\n2400:3200:baba::1\n2408:8899::1\n2409:8088::1\n240e:4c:4008::1\n52.80.66.66",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "UDP 443 流量",
                "note": "屏蔽 UDP 443 端口流量，部分游戏，流媒体会用这个端口",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "443",
                "sourcePort": "",
                "network": "udp",
                "protocol": ""
            },
            {
                "name": "BT 流量",
                "note": "阻止 BT 流量走代理服务器，否则可能导致代理服务器被封",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": "bittorrent"
            },
            {
                "name": "广告域名",
                "note": "屏蔽热心网友整理的广告域名和广告商域名",
                "outboundTag": "reject",
                "ruleType": "domain",
                "domain": "geosite:category-ads-all",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "GFW 屏蔽域名",
                "note": "代理域名数据库中被 GFW 屏蔽的域名",
                "outboundTag": "proxy",
                "ruleType": "domain",
                "domain": "geosite:gfw",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有 IP",
                "note": "直连代理服务器无法访问的私有 IP 如: 192.168.1.1",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:private",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有域名",
                "note": "直连代理服务器无法访问的私有域名 如: localhost",
                "outboundTag": "direct",
                "ruleType": "domain",
                "domain": "geosite:private",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "中国大陆 IP",
                "note": "直连 IP 数据库中所有的中国大陆 IP",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:cn",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "中国大陆域名",
                "note": "直连域名数据库中的中国大陆常见域名",
                "outboundTag": "direct",
                "ruleType": "domain",
                "domain": "geosite:cn",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            }
        ]
    },
    {
        "name": "俄罗斯模式",
        "note": "专为俄罗斯网络环境优化的访问规则",
        "domainStrategy": "IPIfNonMatch",
        "hash": "d72a14c2761cd31333c99308cd17ee5de31d6dbcc4c4f341efc72c487cbdbfe9",
        "rules": [
            {
                "name": "UDP 443 流量",
                "note": "屏蔽 UDP 443 端口流量，部分游戏，流媒体会用这个端口",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "443",
                "sourcePort": "",
                "network": "udp",
                "protocol": ""
            },
            {
                "name": "BT 流量",
                "note": "阻止 BT 流量走代理服务器，否则可能导致代理服务器被封",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": "bittorrent"
            },
            {
                "name": "广告域名",
                "note": "屏蔽热心网友整理的广告域名和广告商域名",
                "outboundTag": "reject",
                "ruleType": "domain",
                "domain": "geosite:category-ads-all",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有 IP",
                "note": "直连代理服务器无法访问的私有 IP 如: 192.168.1.1",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:private",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有域名",
                "note": "直连代理服务器无法访问的私有域名 如: localhost",
                "outboundTag": "direct",
                "ruleType": "domain",
                "domain": "geosite:private",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "俄罗斯 IP",
                "note": "直连 IP 数据库中所有的俄罗斯 IP",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:ru",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            }
        ]
    },
    {
        "name": "伊朗模式",
        "note": "专为伊朗网络环境优化的访问规则",
        "domainStrategy": "IPIfNonMatch",
        "hash": "60c1cbf0c71c80995516be816b2ddf8b7de4bfc9c6fdc9454db5353c3233cc2b",
        "rules": [
            {
                "name": "UDP 443 流量",
                "note": "屏蔽 UDP 443 端口流量，部分游戏，流媒体会用这个端口",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "443",
                "sourcePort": "",
                "network": "udp",
                "protocol": ""
            },
            {
                "name": "BT 流量",
                "note": "阻止 BT 流量走代理服务器，否则可能导致代理服务器被封",
                "outboundTag": "reject",
                "ruleType": "multi",
                "domain": "",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": "bittorrent"
            },
            {
                "name": "广告域名",
                "note": "屏蔽热心网友整理的广告域名和广告商域名",
                "outboundTag": "reject",
                "ruleType": "domain",
                "domain": "geosite:category-ads-all",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有 IP",
                "note": "直连代理服务器无法访问的私有 IP 如: 192.168.1.1",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:private",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "私有域名",
                "note": "直连代理服务器无法访问的私有域名 如: localhost",
                "outboundTag": "direct",
                "ruleType": "domain",
                "domain": "geosite:private",
                "ip": "",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            },
            {
                "name": "伊朗 IP",
                "note": "直连 IP 数据库中所有的伊朗 IP",
                "outboundTag": "direct",
                "ruleType": "ip",
                "domain": "",
                "ip": "geoip:ir",
                "port": "",
                "sourcePort": "",
                "network": "",
                "protocol": ""
            }
        ]
    }
]

export const DEFAULT_DNS_CONFIG: DnsConfig = {
    enable: true,
    mode: 0,
}

export const DEFAULT_DNS_MODE_ROW: DnsModeRow = {
    name: '',
    note: '',
    hash: '',
    hosts: [],
    servers: [],
    clientIP: '',
    queryStrategy: 'UseIP',
    disableCache: false,
    disableFallback: false,
    disableFallbackIfMatch: false,
}

export const DEFAULT_DNS_MODE_LIST: DnsModeList = [
    {
        "name": "Cloudflare DNS 优先模式",
        "note": "优先使用 Cloudflare DNS、Google DNS 解析域名，中国大陆域名使用阿里云 DNS 解析",
        "hash": "32ba424272a378ec4c55bd9a1f317b1f7485783f6f27c302d659e1139dcba279",
        "hosts": [
            {
                "name": "Google DNS",
                "note": "跳过 Google DNS 域名解析，直接使用 IP 地址",
                "domain": "dns.google",
                "host": "8.8.8.8"
            },
            {
                "name": "Cloudflare DNS",
                "note": "跳过 Cloudflare DNS 域名解析，直接使用 IP 地址",
                "domain": "one.one.one.one",
                "host": "1.1.1.1"
            },
            {
                "name": "阿里云 DNS",
                "note": "跳过阿里云 DNS 域名解析，直接使用 IP 地址",
                "domain": "dns.alidns.com",
                "host": "223.5.5.5"
            },
            {
                "name": "腾讯云 DNS",
                "note": "跳过腾讯云 DNS 域名解析，直接使用 IP 地址",
                "domain": "dns.pub",
                "host": "119.29.29.29"
            },
            {
                "name": "广告域名",
                "note": "跳过远程域名系统解析域名数据库中的广告域名",
                "domain": "geosite:category-ads-all",
                "host": "127.0.0.1"
            }
        ],
        "servers": [
            {
                "name": "Cloudflare DNS",
                "note": "使用 Cloudflare 解析域名数据库中常见的非中国大陆域名",
                "type": "object",
                "address": "https://1.1.1.1/dns-query",
                "port": "",
                "domains": "geosite:geolocation-!cn",
                "expectIPs": "geoip:!cn",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            },
            {
                "name": "Google DNS",
                "note": "使用 Google DNS 系统解析域名",
                "type": "address",
                "address": "8.8.8.8",
                "port": "",
                "domains": "",
                "expectIPs": "",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            },
            {
                "name": "阿里云 DNS",
                "note": "使用阿里云 DNS 解析域名数据库中常见的中国大陆域名",
                "type": "object",
                "address": "223.5.5.5",
                "port": "",
                "domains": "geosite:cn",
                "expectIPs": "geoip:cn",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": true,
                "allowUnexpectedIPs": false
            },
            {
                "name": "本机 DNS",
                "note": "使用本机设置的域名服务器解析域名",
                "type": "address",
                "address": "localhost",
                "port": "",
                "domains": "",
                "expectIPs": "",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            }
        ],
        "clientIP": "",
        "queryStrategy": "UseIP",
        "disableCache": false,
        "disableFallback": false,
        "disableFallbackIfMatch": false
    },
    {
        "name": "Google DNS 优先模式",
        "note": "优先使用 Google DNS 解析，其次使用阿里云 DNS",
        "hash": "b35161a6822e9634f917f0774669969fab556636914a438bb453d75e941db9cb",
        "hosts": [
            {
                "name": "Google DNS",
                "note": "跳过 Google DNS 域名解析，直接使用 IP 地址",
                "domain": "dns.google",
                "host": "8.8.8.8"
            },
            {
                "name": "阿里云 DNS",
                "note": "跳过阿里云 DNS 域名解析，直接使用 IP 地址",
                "domain": "dns.alidns.com",
                "host": "223.5.5.5"
            },
            {
                "name": "广告域名",
                "note": "跳过远程域名系统解析域名数据库中的广告域名",
                "domain": "geosite:category-ads-all",
                "host": "127.0.0.1"
            }
        ],
        "servers": [
            {
                "name": "Google DNS",
                "note": "使用 Google DNS 解析域名",
                "type": "address",
                "address": "8.8.8.8",
                "port": "",
                "domains": "",
                "expectIPs": "",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            },
            {
                "name": "阿里云 DNS",
                "note": "使用阿里云 DNS 解析域名",
                "type": "address",
                "address": "223.5.5.5",
                "port": "",
                "domains": "",
                "expectIPs": "",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            },
            {
                "name": "本机 DNS",
                "note": "使用本机设置的域名服务器解析域名",
                "type": "address",
                "address": "localhost",
                "port": "",
                "domains": "",
                "expectIPs": "",
                "clientIP": "",
                "queryStrategy": "UseIP",
                "timeoutMs": 4000,
                "skipFallback": false,
                "allowUnexpectedIPs": false
            }
        ],
        "clientIP": "",
        "queryStrategy": "UseIP",
        "disableCache": false,
        "disableFallback": false,
        "disableFallbackIfMatch": false
    }
]

export const DEFAULT_DNS_TABLE_LIST: DnsTableList = [
    {
        "name": "[全球] Google Public DNS",
        "note": "全球用户量最大（日均千亿级请求），响应速度快，支持DNSSEC，但隐私政策存在争议；中国大陆访问不稳定，可能被屏蔽",
        "hash": "2c7ed6e0148ed21334fb3b778991cabb300214bca700f24b9e8fed1abe107d05",
        "IPv4": "8.8.8.8\n8.8.4.4",
        "IPv6": "2001:4860:4860::8888\n2001:4860:4860::8844",
        "DoH": "https://dns.google/dns-query",
        "DoT": "dns.google"
    },
    {
        "name": "[全球] Cloudflare DNS",
        "note": "国际服务商，以隐私保护著称（承诺不记录用户IP），全球节点多，响应速度与Google相当；中国大陆访问延迟较高，部分地区被干扰",
        "hash": "dc9818edfb8337b671b1eaa45fb86a49eb9aed8d47a12262508a0af5dec14621",
        "IPv4": "1.1.1.1\n1.0.0.1",
        "IPv6": "2606:4700:4700::1111\n2606:4700:4700::1001",
        "DoH": "https://cloudflare-dns.com/dns-query",
        "DoT": "one.one.one.one"
    },
    {
        "name": "阿里云 DNS",
        "note": "中国大陆速度最快，支持 CDN 优化，IPv6 覆盖全，适合访问中国大陆网站",
        "hash": "782e80b173575531b720bdb572a44e4f11fc26b2b3a9ac7121cd1dce20c54b32",
        "IPv4": "223.5.5.5\n223.6.6.6",
        "IPv6": "2400:3200::1\n2400:3200:baba::1",
        "DoH": "https://dns.alidns.com/dns-query",
        "DoT": "dns.alidns.com"
    },
    {
        "name": "腾讯云 DNS",
        "note": "适合对安全性和隐私有较高要求的用户，游戏和视频解析优化",
        "hash": "2149a382c025a4a4e1d853987e4eaed77083be815c48d1fa3fa79e2eec465c74",
        "IPv4": "1.12.12.12\n119.29.29.29",
        "IPv6": "2402:4e00:1::\n2402:4e00::",
        "DoH": "https://doh.pub/dns-query",
        "DoT": "dot.pub"
    },
    {
        "name": "DNSPod DNS （腾讯）",
        "note": "腾讯旗下，支持ECS（提升CDN解析精度），适合游戏和视频用户",
        "hash": "cd2963d20b8b8bf5e6df3ffc1233c26cc3e8c70b2643c5b480d7d0d9e4f9e402",
        "IPv4": "119.29.29.29\n182.254.116.116",
        "IPv6": "",
        "DoH": "https://119.29.29.29/dns-query",
        "DoT": ""
    },
    {
        "name": "114 DNS",
        "note": "中国大陆老牌稳定DNS，稳定性高，但无广告过滤功能，仅限 IPv4，由南京信风公司（Newifi）于2010年前后推出",
        "hash": "82d6267b6275009df4dbac7ffa05c004e820410c005a553d028963cc7a25ab99",
        "IPv4": "114.114.114.114\n114.114.115.115",
        "IPv6": "",
        "DoH": "https://114.114.114.114/dns-query",
        "DoT": ""
    },
    {
        "name": "114 DNS 安全版",
        "note": "",
        "hash": "0baecc720dcf3734440d75cf0949c1d4bee015120194552283846470c23e7239",
        "IPv4": "114.114.114.119\n114.114.115.119",
        "IPv6": "",
        "DoH": "",
        "DoT": ""
    },
    {
        "name": "114 DNS 家庭版",
        "note": "",
        "hash": "d136bf70865722f4586da85e86b66f8a237c0cadfe290c57b85fc7367ee0f0ea",
        "IPv4": "114.114.114.110\n114.114.115.110",
        "IPv6": "",
        "DoH": "",
        "DoT": ""
    },
    {
        "name": "华为云 DNS",
        "note": "企业级服务，主要面向华为云用户",
        "hash": "5e52eee00cb5ba9bc246cfe64c5f0df82bfdab65298c79d48e8503fa8daee613",
        "IPv4": "100.125.1.250\n100.125.21.250",
        "IPv6": "240c::6666\n240c::6644",
        "DoH": "https://dns.huaweicloud.com/dns-query",
        "DoT": ""
    },
    {
        "name": "百度 DNS",
        "note": "侧重安全拦截，IPv6支持有限，节点覆盖和速度略逊于阿里和 114 DNS",
        "hash": "51d3a209c1fcc433e96a01f0c88b38e275ca0d5cebd669e197056f64020b9b52",
        "IPv4": "180.76.76.76",
        "IPv6": "2400:da00::6666",
        "DoH": "https://180.76.76.76/dns-query",
        "DoT": ""
    },
    {
        "name": "360 DNS",
        "note": "过滤恶意网站，适合家庭用户，仅限 IPv4",
        "hash": "d239aa4795aafd93e31882a5f5c4041987adfa4bc8ba5a47a39271869135ea13",
        "IPv4": "101.226.4.6\n123.125.81.6\n218.30.118.6",
        "IPv6": "",
        "DoH": "https://doh.360.cn/dns-query",
        "DoT": "dot.360.cn"
    },
    {
        "name": "OneDNS",
        "note": "OneDNS 是由北京微步在线科技有限公司提供的 DNS 服务",
        "hash": "5f6677b27a884b996c4da496cd6c58adc80a765d5fc00b5b67d48d146b5526d2",
        "IPv4": "117.50.22.22\n52.80.66.66",
        "IPv6": "",
        "DoH": "https://117.50.22.22/dns-query",
        "DoT": ""
    },
    {
        "name": "清华大学 DNS",
        "note": "",
        "hash": "b9cc9d2101ca00a7d186535ef1f9abe4e690c9f0946fc8ff3ddd30007144c3c9",
        "IPv4": "101.6.6.6",
        "IPv6": "2001:da8:202:10::36",
        "DoH": "https://101.6.6.6/dns-query",
        "DoT": ""
    },
    {
        "name": "CNNIC DNS",
        "note": "CNNIC DNS 是由中国互联网信息中心（China Internet Network Information Center，简称 CNNIC）提供的免费公共 DNS 服务，国家域名系统，稳定性高，但已逐渐下线",
        "hash": "192af06b89ea2575f3463d1418c10491a7b222626e6e3f43887285ca706affea",
        "IPv4": "1.2.4.8\n210.2.4.8",
        "IPv6": "",
        "DoH": "https://1.2.4.8/dns-query",
        "DoT": ""
    },
    {
        "name": "中国电信 DNS",
        "note": "",
        "hash": "17cc93f45632afc63292bd1af16884252628d7bcc63eccf3722385a470cff51a",
        "IPv4": "222.222.222.222\n222.222.202.202\n202.96.128.86",
        "IPv6": "240e:4c:4008::1\n240e:4c:4808::1",
        "DoH": "https://202.96.128.86/dns-query",
        "DoT": ""
    },
    {
        "name": "中国移动 DNS",
        "note": "",
        "hash": "88ffdd6a1f4989ff6b01de2e2c293fec3479a3dab22b65fd0dbf53f6ebbec1ea",
        "IPv4": "211.136.192.6\n211.136.192.7",
        "IPv6": "2409:8088::1\n2409:8088::a\n2409:8088::b",
        "DoH": "https://211.136.192.6/dns-query",
        "DoT": ""
    },
    {
        "name": "中国联通 DNS",
        "note": "",
        "hash": "105be68b9aadd957e057bf345dbe45881f66ac06f351f7d77e7faf7c130a7b5b",
        "IPv4": "123.125.81.6\n140.207.198.6",
        "IPv6": "2408:8899::1",
        "DoH": "https://123.125.81.6/dns-query",
        "DoT": ""
    },
    {
        "name": "知道创宇 DNS",
        "note": "安全防护型DNS，拦截钓鱼网站",
        "hash": "374d59909cc0425bd7619b85b0c1d1b50b0b02e1268cd0b73787384dd2d40734",
        "IPv4": "1.1.8.8\n1.0.8.8",
        "IPv6": "",
        "DoH": "",
        "DoT": ""
    },
    {
        "name": "[全球] OpenDNS (Cisco)",
        "note": "主打安全防护（过滤恶意网站），适合家庭和企业，提供家长控制功能",
        "hash": "08be55e3f775db0072f1fec32e34fb6a795314226fa626918ec579cc13f014ae",
        "IPv4": "208.67.222.222\n208.67.220.220",
        "IPv6": "2620:119:35::35\n2620:119:53::53",
        "DoH": "https://doh.opendns.com/dns-query",
        "DoT": ""
    },
    {
        "name": "[全球] Quad9",
        "note": "非营利组织运营，实时拦截恶意域名，隐私保护强，但节点覆盖略差，中国大陆访问受限",
        "hash": "b352f5aed9d47e8bf648c623aaa0a458a97b75fe1e42cd4e16936ca7c057993b",
        "IPv4": "9.9.9.9\n149.112.112.112",
        "IPv6": "2620:fe::fe",
        "DoH": "https://dns.quad9.net/dns-query",
        "DoT": ""
    },
    {
        "name": "[全球] AdGuard DNS",
        "note": "专注广告和跟踪器拦截，适合厌恶广告的用户，提供免费版和付费版",
        "hash": "4c3b7e7dfb8b2cdd5eea728109cb2fab7d70906921c9e3a559d2eacbbce0170a",
        "IPv4": "94.140.14.14\n94.140.15.15",
        "IPv6": "2a10:50c0::ad1:ff\n2a10:50c0::ad2:ff",
        "DoH": "https://dns.adguard.com/dns-query",
        "DoT": ""
    },
    {
        "name": "[全球] DNS.SB",
        "note": "小众服务商，支持无审查解析，中国大陆速度波动大",
        "hash": "4c867afc0100d0b0d0a2e312240f1e917a5a1e826f798426b9682c573011431f",
        "IPv4": "185.222.222.222\n45.11.45.11",
        "IPv6": "2a09::1\n2a09::2",
        "DoH": "https://doh.dns.sb/dns-query",
        "DoT": "dns.sb"
    }
]

export const DEFAULT_SPEED_TEST_CONFIG: SpeedTestConfig = {
    "ipTestActive": 0,
    "pingActive": 0,
    "downloadActive": 0,
    "uploadActive": 0,
    "ipTestContent": "https://myip.ipip.net#IP（中文，含地理位置）\nhttps://httpbin.org/ip#IP（基础调试）\nhttps://ipinfo.io/ip#IP（简洁）\nhttps://ifconfig.me#IP（终端工具友好）\nhttps://api.ipify.org#IP（最简纯 IP）\nhttps://checkip.amazonaws.com#IP（Amazon 提供）\nhttps://ipinfo.io/json#IP 和归属地（JSON）\nhttps://ifconfig.co/json#IP 和地理信息（JSON）",
    "pingContent": "http://www.gstatic.com/generate_204#Google 网络检测\nhttps://www.google.com/generate_204#Google 备用检测\nhttps://www.youtube.com/generate_204#Youtube 备用检测\nhttp://cp.cloudflare.com/generate_204#Cloudflare 网络检测\nhttp://captive.apple.com/hotspot-detect.htm#Apple 网络检测\nhttp://www.msftconnecttest.com/connecttest.txt#Microsoft 网络检测",
    "downloadContent": "https://cachefly.cachefly.net/10mb.test#CacheFly 10M（全球高速 CDN）\nhttps://cachefly.cachefly.net/50mb.test#CacheFly 50M（全球高速 CDN）\nhttp://ipv4.download.thinkbroadband.com/50MB.zip#ThinkBroadband（英国）\nhttp://proof.ovh.net/files/100Mb.dat#OVH（法国）\nhttps://speedtest.tokyo2.linode.com/100MB-tokyo2.bin#Linode（日本东京）\nhttp://speedtest.tele2.net/100MB.zip#Tele2（瑞典）\nhttp://down.360safe.com/setup.exe#360 安全卫士安装包（100+MB）",
    "uploadContent": "https://speed.cloudflare.com/__up#Cloudflare 上传测速（全球 CDN）\nhttps://fra.speedtest.clouvider.net/backend/empty.php#Speedtest 上传测速（法国）\nhttps://test.ustc.edu.cn/results/result.php#Speedtest 上传测速（中国科学技术大学）\nhttps://api-v3.speedtest.cn/speed/store#speedtest.cn 上传测速（中国测速网）"
}

export const DEFAULT_USER_AGENT_LIST = [
    {
        "name": "Chrome (Windows)",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    },
    {
        "name": "Chrome (macOS)",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    },
    {
        "name": "Firefox (Windows)",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
    },
    {
        "name": "Safari (macOS)",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15"
    },
    {
        "name": "Edge (Windows)",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0"
    },
    {
        "name": "Safari (iPhone)",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    },
    {
        "name": "Chrome (Android)",
        "userAgent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.60 Mobile Safari/537.36"
    },
    {
        "name": "WeChat (iOS)",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.52(0x1800342b) NetType/WIFI Language/zh_CN"
    },
    {
        "name": "QQ Browser (Android)",
        "userAgent": "Mozilla/5.0 (Linux; U; Android 13; zh-cn; SM-G9730 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Mobile Safari/537.36 MQQBrowser/11.8 Mobile"
    },
    {
        "name": "Baidu Spider",
        "userAgent": "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)"
    }
]
