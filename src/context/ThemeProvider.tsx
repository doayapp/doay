import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import useMediaQuery from '@mui/material/useMediaQuery'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import { setThemeWindow } from "../util/tauri.ts"

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
    mode: ThemeMode;
    toggleMode: (newMode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'system',
    toggleMode: () => {
    },
})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({children}: { children: React.ReactNode }) => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const [mode, setMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('themeMode') as ThemeMode
        return ['light', 'dark', 'system'].includes(savedMode) ? savedMode : 'system'
    })

    const setTheme = (newMode: ThemeMode) => {
        newMode = ['light', 'dark', 'system'].includes(newMode) ? newMode : 'system'
        setMode(newMode)
        setThemeWindow(newMode === 'system' ? null : newMode).catch()
    }

    useEffect(() => {
        const savedMode = localStorage.getItem('themeMode') as ThemeMode | null
        if (savedMode) setTheme(savedMode)
    }, [])

    useEffect(() => localStorage.setItem('themeMode', mode), [mode])

    useEffect(() => {
        const htmlElement = document.documentElement
        const paletteMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode
        htmlElement.classList.remove('light', 'dark')
        htmlElement.classList.add(paletteMode)
    }, [mode, prefersDarkMode])

    const toggleMode = (newMode: ThemeMode) => {
        setTheme(newMode)
    }

    const theme = useMemo(() => {
        const paletteMode = mode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : mode
        return createTheme({
            palette: {mode: paletteMode},
            components: {
                MuiCard: {
                    styleOverrides: {
                        root: ({theme}) => ({
                            border: theme.palette.mode === 'light' ? '1px solid' : 'none',
                            borderColor: theme.palette.mode === 'light' ? theme.palette.divider : 'transparent'
                        })
                    }
                }
            }
        })
    }, [mode, prefersDarkMode])

    return (
        <ThemeContext.Provider value={{mode, toggleMode}}>
            <MuiThemeProvider theme={theme}>
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    )
}
