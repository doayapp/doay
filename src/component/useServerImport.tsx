import { getNewServerList } from "../util/server.ts"
import { saveServerList } from "../util/invoke.ts"

export const useServerImport = async (
    inputValue: string,
    showSnackbar: (msg: string, severity?: 'success' | 'info' | 'warning' | 'error') => void,
    setError?: ((value: boolean) => void) | null,
    onSuccess?: () => void,
) => {
    const s = inputValue.trim()
    if (!s) return

    const {newServerList, errNum, existNum, newNum} = await getNewServerList(s)

    const errMsg = `解析链接（URI）错误: ${errNum} 条`
    const okMsg = `导入成功: ${newNum} 条`
    const existMsg = `已存在: ${existNum} 条`
    setError && setError(existNum > 0)
    if (newNum) {
        const ok = await saveServerList(newServerList)
        if (!ok) {
            showSnackbar('导入失败', 'error')
        } else {
            if (errNum) {
                showSnackbar(`${errMsg}，${okMsg}，${existMsg}`, 'error')
            } else if (existNum) {
                showSnackbar(`${existMsg}，${okMsg}`, 'warning')
            } else {
                showSnackbar(okMsg)
            }
            onSuccess && onSuccess()
        }
    } else if (existNum) {
        if (errNum) {
            showSnackbar(`${existMsg}，${errMsg}，${okMsg}`, 'error')
        } else if (existNum) {
            showSnackbar(`${existMsg}，${okMsg}`, 'warning')
        }
    } else {
        showSnackbar(errMsg, 'error')
    }
}
