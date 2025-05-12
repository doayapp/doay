// 预编译正则表达式
const timestampRegex = /(\d{4}[-\/]\d{2}[-\/]\d{2}[\sT]\d{2}:\d{2}:\d{2}(?:\.\d+)?)/g
const ipWithPortRegex = /\b(?:\d{1,3}\.){3}\d{1,3}(:\d{1,5})?\b/g
const ipv6WithPortRegex = /\b(?:([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4})(:\d{1,5})?\b/g
const domainWithPortRegex = /\b(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}:\d{1,5}|localhost|broadcasthost|(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|cn|us|uk|de|jp|fr|ru|info|biz|at))\b/g
const numberRegex = /(^|\s)(\d+\.\d+|\d+)($|\s)/g

// 关键词映射
const keywordMap = [
    {regex: /\berror\b/gi, color: 'red'},
    {regex: /\bwarn\b/gi, color: 'orange'},
    {regex: /\bwarning\b/gi, color: 'orange'},
    {regex: /\binfo\b/gi, color: 'green'},
    {regex: /\bdebug\b/gi, color: 'blue'},
    {regex: /\btrace\b/gi, color: 'purple'},
    {regex: /\bdoay\b/gi, color: '#4caf50'},
    {regex: /\btauri\b/gi, color: '#4caf50'},
    {regex: /\brustc\b/gi, color: '#4caf50'},
    {regex: /\btcp:\b/gi, color: '#9c27b0'},
    {regex: /\budp:\b/gi, color: '#e65100'},
    {regex: /\bxray\b/gi, color: '#e65100'},
    {regex: /\bfailed\b/gi, color: 'red'},
    {regex: /\bbroken\b/gi, color: 'red'},
    {regex: /\bdns\b/gi, color: '#568ed9'},
    {regex: /\bproxy\b/g, color: '#fb8c00'},
    {regex: /\bdirect\b/g, color: '#4caf50'},
    {regex: /\breject\b/g, color: '#d50000'},
    {regex: /\binbound\b/g, color: '#69ab73'},
    {regex: /\boutbound\b/g, color: '#cf8e6d'},
    {regex: /\binvalid args\b/g, color: 'red'},
    {regex: /\bmissing required key\b/g, color: 'red'},
    {regex: /\bNo such file or directory\b/gi, color: 'red'},
    {regex: /\baddress already in use\b/gi, color: 'red'}
]

const errorCodes = [404, 500, 403, 502]

/**
 * 高亮日志内容
 * @param content 日志内容
 * @returns 高亮后的 HTML 字符串数组
 */
export default (content: string): string[] => {
    return content.split('\n').map(line => {
        // 转义 HTML 特殊字符，防止 XSS 攻击
        line = line.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')

        // 关键词匹配
        keywordMap.forEach(({regex, color}) => {
            line = line.replace(regex, `<span style="color: ${color}">$&</span>`)
        })

        // 特殊格式匹配
        line = line
            .replace(timestampRegex, '<span style="color: gray">$&</span>')
            .replace(ipWithPortRegex, '<span style="color: #ff8f00">$&</span>')
            .replace(ipv6WithPortRegex, '<span style="color: #ff8f00">$&</span>')
            .replace(domainWithPortRegex, '<span style="color: #c279b6">$&</span>')
            .replace(numberRegex, match => {
                return match.replace(/(\d+\.\d+|\d+)/, number => {
                    if (number === '200') return `<span style="color: green">${match}</span>`
                    if (errorCodes.includes(parseInt(number))) return `<span style="color: red">${match}</span>`
                    if (number.includes('.')) return `<span style="color: #ff6f00">${number}</span>`
                    return `<span style="color: #2aacb8">${number}</span>`
                })
            })

        return line
    })
};
