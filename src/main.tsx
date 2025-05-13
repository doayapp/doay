import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const isDev = import.meta.env.MODE === 'development'
if (!isDev) document.addEventListener('contextmenu', e => e.preventDefault())

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)
