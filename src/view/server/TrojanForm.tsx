import { Grid } from '@mui/material'
import { TextField } from '@mui/material'
import { SelectField } from '../../component/SelectField.tsx'
import { trojanNetworkTypeList } from "../../util/serverOption.ts"

interface TrojanFormProps {
    form: TrojanRow
    errors: {
        addError: boolean
        portError: boolean
        pwdError: boolean
    }
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    setFormData: (name: string, value: any) => void
}

export const TrojanForm = ({form, errors, handleChange, setFormData}: TrojanFormProps) => {
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
            <TextField
                fullWidth size="small" label="密码(password)" name="pwd" value={form.pwd}
                error={errors.pwdError} helperText={errors.pwdError ? "密码不能为空" : ""}
                onChange={handleChange}/>
        </Grid>

        <Grid size={12} sx={{mt: 2}}>
            <SelectField
                label="传输方式(network)" id="trojan-network" value={form.net} options={trojanNetworkTypeList}
                onChange={(value) => setFormData('net', value)}/>
        </Grid>
        <Grid size={12}>
            <TextField fullWidth size="small" label="伪装域名(host)" name="host" value={form.host} onChange={handleChange}/>
        </Grid>
        <Grid size={12}>
            <TextField
                fullWidth size="small"
                label={form.net !== 'grpc' ? '伪装路径(path)' : '伪装主机名(serviceName)'}
                name="path" value={form.path} onChange={handleChange}/>
        </Grid>
    </>)
}
