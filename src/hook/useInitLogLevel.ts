import { useEffect } from 'react'
import { readAppConfig } from "../util/invoke.ts"
import { useDebounce } from "./useDebounce.ts"
import { DEFAULT_APP_CONFIG } from "../util/config.ts"

export const useInitLogLevel = () => {
    const loadConfig = useDebounce(async () => {
        const appConf = (await readAppConfig() as AppConfig) || DEFAULT_APP_CONFIG
        if (appConf?.app_log_level) {
            window.__APP_LOG_LEVEL__ = appConf.app_log_level
        }
    }, 50)
    useEffect(loadConfig, [])
}
