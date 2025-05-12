import { writeText, readText, readImage, writeImage } from '@tauri-apps/plugin-clipboard-manager'
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart'
import { revealItemInDir, openUrl as openUrlTauri } from '@tauri-apps/plugin-opener'
import { Image } from '@tauri-apps/api/image'
import { save, SaveDialogOptions } from '@tauri-apps/plugin-dialog'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { IS_TAURI, log } from "./invoke.ts"

export async function hideWindow() {
    if (!IS_TAURI) return false
    try {
        await getCurrentWindow().hide()
        return true
    } catch (e) {
        log.error(`Tauri hide Window error: ${e}`)
        return false
    }
}

export async function showWindow() {
    if (!IS_TAURI) return false
    try {
        await getCurrentWindow().show()
        return true
    } catch (e) {
        log.error(`Tauri show Window error: ${e}`)
        return false
    }
}

export async function showAndFocusWindow() {
    if (!IS_TAURI) return false
    try {
        const window = getCurrentWindow()
        await window.show()
        await window.setFocus()
        return true
    } catch (e) {
        log.error(`Tauri show Window error: ${e}`)
        return false
    }
}

export async function isVisibleWindow() {
    if (!IS_TAURI) return false
    try {
        return await getCurrentWindow().isVisible()
    } catch (e) {
        log.error(`Tauri isVisibleWindow error: ${e}`)
        return false
    }
}

export async function isFocusedWindow() {
    if (!IS_TAURI) return false
    try {
        return await getCurrentWindow().isFocused()
    } catch (e) {
        log.error(`Tauri isFocusedWindow error: ${e}`)
        return false
    }
}

export async function showSaveDialog(options?: SaveDialogOptions) {
    if (!IS_TAURI) return false
    try {
        const path = await save(options)
        return path || ''
    } catch (e) {
        log.error(`Tauri save dialog error: ${e}`)
        return ''
    }
}

export async function createImage(rgba: number[] | Uint8Array | ArrayBuffer, width: number, height: number) {
    if (!IS_TAURI) return false
    try {
        return await Image.new(rgba, width, height)
    } catch (err) {
        log.error('Failed to createImage:', err)
        return false
    }
}

export async function clipboardWriteText(text: string) {
    if (!IS_TAURI) return false
    try {
        await writeText(text)
        return true
    } catch (err) {
        log.error('Failed to clipboardWriteText:', err)
        return false
    }
}

export async function clipboardWriteImage(image: string | Image | Uint8Array | ArrayBuffer | number[]) {
    if (!IS_TAURI) return false
    try {
        await writeImage(image)
        return true
    } catch (err) {
        log.error('Failed to clipboardWriteImage:', err)
        return false
    }
}

export async function clipboardReadText() {
    return await readText()
}

export async function clipboardReadImage() {
    return await readImage()
}

export async function isAutoStartEnabled() {
    if (!IS_TAURI) return false
    try {
        return await isEnabled()
    } catch (err) {
        log.error('Failed to isAutoStartEnabled:', err)
        return false
    }
}

export async function saveAutoStart(value: boolean) {
    if (!IS_TAURI) return false
    try {
        value ? await enable() : await disable()
        return true
    } catch (err) {
        log.error('Failed to setAutoStart:', err)
        return false
    }
}

export async function openDir(path: string) {
    if (!IS_TAURI) return false
    try {
        revealItemInDir(path)
        return true
    } catch (err) {
        log.error('Failed to revealItemInDir:', err)
        return false
    }
}

export async function openUrl(path: string) {
    if (!IS_TAURI) return false
    try {
        openUrlTauri(path)
        return true
    } catch (err) {
        log.error('Failed to openUrl:', err)
        return false
    }
}
