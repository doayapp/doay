import { useState } from 'react'
import {
    FormControl,
    InputLabel,
    OutlinedInput,
    InputAdornment,
    IconButton,
    FormHelperText
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'

interface PasswordInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: boolean;
    helperText?: string;
}

export const PasswordInput = ({label, value, onChange, error, helperText}: PasswordInputProps) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <FormControl fullWidth size="small" variant="outlined" error={error}>
            <InputLabel>{label}</InputLabel>
            <OutlinedInput
                label={label}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                endAdornment={
                    <InputAdornment position="end">
                        <IconButton
                            aria-label={showPassword ? 'hide the password' : 'show the password'}
                            onClick={() => setShowPassword((show) => !show)}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                            edge="end"
                        >
                            {showPassword ? <VisibilityOff/> : <Visibility/>}
                        </IconButton>
                    </InputAdornment>
                }
            />
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    )
}
