import { useState, useEffect } from 'react'

export const useFullHeight = () => {
    const [height, setHeight] = useState(window.innerHeight)

    useEffect(() => {
        const handleResize = () => {
            setHeight(window.innerHeight)
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return height
}
