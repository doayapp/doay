import { useRef } from 'react'

export const useDebounce = (fn: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<number>(0)
    return (...args: any[]) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => fn(...args), delay)
    }
}
