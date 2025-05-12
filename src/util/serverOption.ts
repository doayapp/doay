export const vmessNetworkTypeList = [
    'raw',
    'kcp',
    'ws',
    'http',
    'grpc',
    'httpupgrade',
]

export const vmessSecurityList = [
    'none',
    'auto',
    'zero',
    'aes-128-gcm',
    'chacha20-poly1305',
]

export const vlessNetworkTypeList = [
    'raw',
    'ws',
    'grpc',
    'xhttp',
]

export const vlessSecurityList = [
    'none',
    'tls',
    'reality',
]

export const ssMethodList = [
    'none',
    '2022-blake3-aes-128-gcm',
    '2022-blake3-aes-256-gcm',
    '2022-blake3-chacha20-poly1305',
    'aes-128-gcm',
    'aes-256-gcm',
    // 'chacha20-poly1305',
    // 'xchacha20-poly1305',
    'chacha20-ietf-poly1305',
    'xchacha20-ietf-poly1305',
]

export const trojanNetworkTypeList = [
    'ws',
    'grpc',
]

export const flowList = [
    'xtls-rprx-vision',
    'xtls-rprx-vision-udp443',
]

export const fingerprintList = [
    'chrome',
    'firefox',
    'safari',
    'edge',
    '360',
    'qq',
    'ios',
    'android',
    'random',
    'randomized',
]

export const rawHeaderTypeList = [
    'none',
    'http',
]

export const kcpHeaderTypeList = [
    'none',
    'srtp',
    'utp',
    'wechat-video',
    'dtls',
    'wireguard',
]

export const grpcModeList = [
    'gun',
    'multi',
]

export const xhttpModeList = [
    'auto',
    'packet-up',
    'stream-up',
    'stream-one',
]

export const alpnList = [
    'http/1.1',
    'h2',
    'h2, http/1.1',
    'h3',
    'h3, h2',
    'h3, h2, http/1.1',
]
