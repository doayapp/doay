import { useState, useEffect } from 'react'

export const useVisibility = () => {
    const [isVisibility, setIsVisibility] = useState(true)
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisibility(document.visibilityState === 'visible')
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])
    return isVisibility
}
