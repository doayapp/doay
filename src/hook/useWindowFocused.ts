import { useState, useEffect } from 'react'

export const useWindowFocused = () => {
    const [isWindowFocused, setIsWindowFocused] = useState(true)

    useEffect(() => {
        const handleFocus = () => setIsWindowFocused(true)
        const handleBlur = () => setIsWindowFocused(false)

        window.addEventListener('focus', handleFocus)
        window.addEventListener('blur', handleBlur)

        return () => {
            window.removeEventListener('focus', handleFocus)
            window.removeEventListener('blur', handleBlur)
        }
    }, [])

    return isWindowFocused
}
