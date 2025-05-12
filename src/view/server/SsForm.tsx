import { Grid } from '@mui/material'
import { TextField } from '@mui/material'
import { AutoCompleteField } from '../../component/AutoCompleteField.tsx'
import { PasswordInput } from '../../component/PasswordInput.tsx'
import { ssMethodList } from "../../util/serverOption.ts"

interface SsFormProps {
    form: SsRow
    errors: {
        addError: boolean
        portError: boolean
        pwdError: boolean
    }
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    setFormData: (name: string, value: any) => void
}

export const SsForm = ({form, errors, handleChange, setFormData}: SsFormProps) => {
    return (<>
        <Grid size={{xs: 12, md: 8}}>
            <TextField
                fullWidth size="small" label="IP/域名(address)" name="add" value={form.add}
                error={errors.addError} helperText={errors.addError ? "服务器地址不能为空" : ""}
                onChange={handleChange}/>
        </Grid>
        <Grid size={{xs: 12, md: 4}}>
            <TextField
                fullWidth size="small" label="端口(port)" name="port" value={form.port}
                error={errors.portError} helperText={errors.portError ? "端口号必须在1-65535之间" : ""}
                onChange={handleChange}/>
        </Grid>
        <Grid size={12}>
            <PasswordInput
                label="密码(password)" value={form.pwd}
                error={errors.pwdError} helperText={errors.pwdError ? "密码不能为空" : ""}
                onChange={(value) => {
                    setFormData('pwd', value)
                }}/>
        </Grid>
        <Grid size={12}>
            <AutoCompleteField
                label="加密方式(method)" id="ss-method" value={form.scy} options={ssMethodList}
                onChange={(value) => setFormData('scy', value)}/>
        </Grid>
    </>)
}
