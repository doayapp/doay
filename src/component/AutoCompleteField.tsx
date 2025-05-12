import { useState, useEffect } from 'react'
import { Autocomplete, TextField } from '@mui/material'

interface AutoCompleteFieldProps {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    id?: string;
}

export const AutoCompleteField = ({label, value, options, onChange, id}: AutoCompleteFieldProps) => {
    const [inputValue, setInputValue] = useState(value)

    useEffect(() => {
        setInputValue(value)
    }, [value])

    return (
        <Autocomplete
            id={id}
            size="small"
            fullWidth
            freeSolo
            value={value}
            inputValue={inputValue}
            onInputChange={(_, v) => setInputValue(v)}
            onChange={(_, v) => onChange(v || '')}
            onBlur={() => onChange(inputValue)}
            options={options}
            renderInput={(params) => <TextField label={label} {...params} />}
        />
    )
}
