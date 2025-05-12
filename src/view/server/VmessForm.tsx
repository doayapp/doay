import { Grid, Stack, Typography, Switch, TextField, Button } from '@mui/material'
import { SelectField } from '../../component/SelectField.tsx'
import { AutoCompleteField } from '../../component/AutoCompleteField.tsx'
import {
    vmessNetworkTypeList, vmessSecurityList,
    kcpHeaderTypeList, rawHeaderTypeList, grpcModeList, alpnList, fingerprintList
} from "../../util/serverOption.ts"
import { generateUUID } from "../../util/util.ts"

interface VmessFormProps {
    form: VmessRow
    errors: {
        addError: boolean
        portError: boolean
        idError: boolean
        idNotUUID: boolean
    }
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    setFormData: (name: string, value: any) => void
}

export const VmessForm = ({form, errors, handleChange, setFormData}: VmessFormProps) => {
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
            <Stack direction="row" spacing={0.5} alignItems="flex-start">
                <TextField
                    sx={{flex: 1}}
                    fullWidth size="small"
                    label="用户 ID"
                    error={errors.idError}
                    helperText={errors.idNotUUID ? "用户ID必须是有效的UUID格式" : errors.idError ? "用户ID不能为空" : ""}
                    value={form.id}
                    onChange={(e) => setFormData('id', e.target.value)}
                />
                <Button
                    sx={{whiteSpace: 'nowrap', height: '40px', alignSelf: 'flex-start'}}
                    variant="contained"
                    onClick={() => setFormData('id', generateUUID())}>
                    生成 UUID
                </Button>
            </Stack>
        </Grid>
        <Grid size={12}>
            <TextField fullWidth size="small" label="额外 ID (alterId)" name="aid" value={form.aid} onChange={handleChange}/>
        </Grid>

        <Grid size={12} sx={{mt: 2}}>
            <SelectField
                label="传输方式(network)" id="vmess-network" value={form.net} options={vmessNetworkTypeList}
                onChange={(value) => setFormData('net', value)}/>
        </Grid>
        <Grid size={12}>
            <SelectField
                label="安全类型(security)" id="vmess-security" value={form.scy} options={vmessSecurityList}
                onChange={(value) => setFormData('scy', value)}/>
        </Grid>

        <Grid container spacing={2} size={12} sx={{mt: 2}}>
            {form.net !== 'raw' && (<>
                <Grid size={12}>
                    <TextField fullWidth size="small" label="伪装域名(host)" name="host" value={form.host} onChange={handleChange}/>
                </Grid>
                <Grid size={12}>
                    <TextField
                        label={form.net === 'grpc' ? '伪装主机名(serviceName)' : form.net === 'kcp' ? 'mKCP 种子(seed)' : '伪装路径(path)'}
                        fullWidth size="small" name="path" value={form.path} onChange={handleChange}/>
                </Grid>
            </>)}

            {['raw', 'kcp'].includes(form.net) && (
                <Grid size={12}>
                    <SelectField
                        label="伪装类型(headerType)" id="vmess-type" value={form.type}
                        options={form.net === 'kcp' ? kcpHeaderTypeList : rawHeaderTypeList}
                        onChange={(value) => setFormData('type', value)}/>
                </Grid>
            )}

            {form.net === 'grpc' && (<>
                <Grid size={12}>
                    <SelectField
                        label="gRPC 传输模式(mode)" id="vmess-grpc-mode" value={form.mode || 'gun'} options={grpcModeList}
                        onChange={(value) => setFormData('mode', value)}/>
                </Grid>
            </>)}
        </Grid>

        <Grid size={12} sx={{mt: 2}}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{width: '100%'}}>
                <Typography variant="body1" sx={{pl: 1}}>TLS 安全协议</Typography>
                <Switch checked={form.tls} onChange={(e) => setFormData('tls', e.target.checked)}/>
            </Stack>
        </Grid>
        {form.tls && (<>
            <Grid size={12}>
                <SelectField label="TLS ALPN 协议" id="vmess-alpn" value={form.alpn || 'h2, http/1.1'} options={alpnList}
                             onChange={(value) => setFormData('alpn', value)}/>
            </Grid>
            <Grid size={12}>
                <AutoCompleteField
                    label="TLS 伪装指纹(fingerprint)" id="vmess-fp" value={form.fp} options={fingerprintList}
                    onChange={(value) => setFormData('fp', value)}/>
            </Grid>
        </>)}
    </>)
}
