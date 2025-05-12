import { MenuItem, TextField } from '@mui/material'

interface SelectFieldProps {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    id?: string;
}

export const SelectField = ({label, value, options, onChange, id}: SelectFieldProps) => {
    return (
        <TextField
            select fullWidth size="small"
            label={label}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map((v) => (
                <MenuItem key={v} value={v}>{v}</MenuItem>
            ))}
        </TextField>
    )
}
