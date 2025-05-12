import { Grid } from '@mui/material'
import { TextField, Stack, Button } from '@mui/material'
import { SelectField } from '../../component/SelectField.tsx'
import { AutoCompleteField } from '../../component/AutoCompleteField.tsx'
import {
    vlessNetworkTypeList, vlessSecurityList,
    grpcModeList, xhttpModeList, alpnList, fingerprintList, flowList
} from "../../util/serverOption.ts"
import { generateUUID } from "../../util/util.ts"

interface VlessFormProps {
    form: VlessRow
    errors: {
        addError: boolean
        portError: boolean
        idError: boolean
        idNotUUID: boolean
    }
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    setFormData: (name: string, value: any) => void
}

export const VlessForm = ({form, errors, handleChange, setFormData}: VlessFormProps) => {
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

        <Grid size={12} sx={{mt: 2}}>
            <SelectField
                label="传输方式(network)" id="vless-network" value={form.net} options={vlessNetworkTypeList}
                onChange={(value) => setFormData('net', value)}/>
        </Grid>
        <Grid size={12}>
            <SelectField
                label="安全类型(security)" id="vless-security" value={form.scy} options={vlessSecurityList}
                onChange={(value) => setFormData('scy', value)}/>
        </Grid>

        {(form.net !== 'raw' || form.scy === 'reality') && (<>
            <Grid size={12} sx={{mt: 2}}>
                <TextField fullWidth size="small" label="伪装域名(host)" name="host" value={form.host} onChange={handleChange}/>
            </Grid>
            <Grid size={12}>
                <TextField
                    fullWidth size="small"
                    label={(form.net === 'grpc' || form.scy === 'reality') ? '伪装主机名(serviceName)' : '伪装路径(path)'}
                    name="path" value={form.path} onChange={handleChange}/>
            </Grid>
        </>)}

        {form.net === 'grpc' && (<>
            <Grid size={12} sx={{mt: 2}}>
                <SelectField
                    label="gRPC 传输模式(mode)" id="vless-grpc-mode" value={form.mode || 'gun'} options={grpcModeList}
                    onChange={(value) => setFormData('mode', value)}/>
            </Grid>
        </>)}

        {form.net === 'xhttp' && (<>
            <Grid size={12} sx={{mt: 2}}>
                <SelectField
                    label="XHTTP 传输模式(mode)" id="vless-xhttp-mode" value={form.mode || 'auto'} options={xhttpModeList}
                    onChange={(value) => setFormData('mode', value)}/>
            </Grid>
            <Grid size={12}>
                <TextField fullWidth multiline minRows={2} size="small" label="XHTTP 额外参数(extra)" name="extra" value={form.extra} onChange={handleChange}/>
            </Grid>
        </>)}

        {form.scy !== 'none' && (<>
            <Grid size={12} sx={{mt: 2}}>
                <SelectField
                    label="TLS ALPN 协议" id="vless-alpn" value={form.alpn || 'h2, http/1.1'} options={alpnList}
                    onChange={(value) => setFormData('alpn', value)}/>
            </Grid>
            <Grid size={12}>
                <AutoCompleteField
                    label="TLS 伪装指纹(fingerprint)" id="vless-fp" value={form.fp} options={fingerprintList}
                    onChange={(value) => setFormData('fp', value)}/>
            </Grid>
            <Grid size={12}>
                <AutoCompleteField
                    label="XTLS 流控模式(flow)" id="vless-flow" value={form.flow} options={flowList}
                    onChange={(value) => setFormData('flow', value)}/>
            </Grid>
        </>)}

        {form.scy === 'reality' && (<>
            <Grid size={12} sx={{mt: 2}}>
                <TextField fullWidth size="small" label="公钥(public key)" name="pbk" value={form.pbk} onChange={handleChange}/>
            </Grid>
            <Grid size={12}>
                <TextField fullWidth size="small" label="验证 ID(shortId)" name="sid" value={form.sid} onChange={handleChange}/>
            </Grid>
            <Grid size={12}>
                <TextField fullWidth size="small" label="伪装爬虫(spiderX)" name="spx" value={form.spx} onChange={handleChange}/>
            </Grid>
        </>)}
    </>)
}
