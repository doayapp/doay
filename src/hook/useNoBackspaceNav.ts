import { useEffect } from 'react'

const isEditableElement = (el: EventTarget | null): boolean => {
    if (!(el instanceof HTMLElement)) return false

    const tag = el.tagName.toLowerCase()
    const editableTags = ['input', 'textarea', 'select']
    return (editableTags.includes(tag) || el.isContentEditable)
}

// 禁用 Backspace 导致的浏览器后退
export function useNoBackspaceNav() {
    useEffect(() => {
        const handleBackspace = (e: KeyboardEvent) => {
            if (!isEditableElement(e.target)) e.preventDefault()
        }

        window.addEventListener('keydown', handleBackspace)
        return () => window.removeEventListener('keydown', handleBackspace)
    }, [])
}
