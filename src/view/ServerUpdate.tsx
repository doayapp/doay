import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ToggleButtonGroup, ToggleButton, Card, TextField, Button, Grid } from '@mui/material'

import { PageHeader } from "../component/PageHeader.tsx"
import { validateServerField, validateServerRow } from "../util/validate.ts"
import { hashJson } from "../util/crypto.ts"
import { readServerList, saveServerList } from "../util/invoke.ts"
import { getScy } from "../util/server.ts"
import { useSnackbar } from "../component/useSnackbar.tsx"
import { LoadingCard, ErrorCard } from "../component/useCard.tsx"
import { VmessForm } from './server/VmessForm.tsx'
import { VlessForm } from './server/VlessForm.tsx'
import { SsForm } from './server/SsForm.tsx'
import { TrojanForm } from './server/TrojanForm.tsx'
import { useDebounce } from "../hook/useDebounce.ts"

const ServerUpdate: React.FC<NavProps> = ({setNavState}) => {
    useEffect(() => setNavState(1), [setNavState])

    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const key = Number(searchParams.get('key'))

    const [serverList, setServerList] = useState<ServerList>()
    const [serverRow, setServerRow] = useState<ServerRow>()
    const [serverType, setServerType] = useState('')
    const [ps, setPs] = useState('')

    const [vmessForm, setVmessForm] = useState<VmessRow>()
    const [vlessForm, setVlessForm] = useState<VlessRow>()
    const [ssForm, setSsForm] = useState<SsRow>()
    const [trojanForm, setTrojanForm] = useState<TrojanRow>()
    const [errorMsg, setErrorMsg] = useState('')

    const loadList = useDebounce(async () => {
        let serverList = await readServerList()
        if (serverList) {
            setServerList(serverList)
            let row = serverList[key]
            if (row) {
                setServerRow(row)
                setServerType(row.type)
                setPs(row.ps)

                if (row.type === 'vmess') {
                    setVmessForm(row.data as VmessRow)
                } else if (row.type === 'vless') {
                    setVlessForm(row.data as VlessRow)
                } else if (row.type === 'ss') {
                    setSsForm(row.data as SsRow)
                } else if (row.type === 'trojan') {
                    setTrojanForm(row.data as TrojanRow)
                }
            } else {
                setErrorMsg('服务器不存在')
            }
        } else {
            setServerList([])
            setErrorMsg('暂无服务器')
        }
    }, 100)
    useEffect(loadList, [])

    const [psError, setPsError] = useState(false)
    const [addError, setAddError] = useState(false)
    const [portError, setPortError] = useState(false)
    const [idError, setIdError] = useState(false)
    const [idNotUUID, setIdNotUUID] = useState(false)
    const [pwdError, setPwdError] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(e.target.name, e.target.value)
    }

    const setFormData = (name: string, value: any) => {
        name = name.trim()
        if (typeof value === 'string') value = value.trim()
        // console.log('setFormData', name, value)

        value = validateServerField(name, value, setAddError, setPortError, setIdError, setIdNotUUID, setPwdError)
        if (serverType === 'vmess') {
            vmessForm && setVmessForm({...vmessForm, [name]: value})
        } else if (serverType === 'vless') {
            vlessForm && setVlessForm({...vlessForm, [name]: value})
        } else if (serverType === 'ss') {
            ssForm && setSsForm({...ssForm, [name]: value})
        } else if (serverType === 'trojan') {
            trojanForm && setTrojanForm({...trojanForm, [name]: value})
        }
    }

    const handleSubmit = async () => {
        let data: VmessRow | VlessRow | SsRow | TrojanRow | null = null
        if (serverType === 'vmess') {
            if (vmessForm) data = vmessForm
        } else if (serverType === 'vless') {
            if (vlessForm) data = vlessForm
        } else if (serverType === 'ss') {
            if (ssForm) data = ssForm
        } else if (serverType === 'trojan') {
            if (trojanForm) data = trojanForm
        }
        if (!data) return

        const isValid = validateServerRow(data, ps, setPsError, setAddError, setPortError, setIdError, setPwdError)
        if (!isValid) return

        let netServerList = serverList ? [...serverList] : []
        if (netServerList[key] && serverRow) {
            const newServer: ServerRow = {
                id: serverRow.id,
                ps: ps,
                on: serverRow.on,
                type: serverType,
                host: `${data.add}:${data.port}`,
                scy: getScy(data),
                hash: await hashJson(data),
                data
            }

            // 排重
            const existKey = netServerList.findIndex((server, i) => server.hash === newServer.hash && i !== key)
            if (existKey !== -1) {
                showSnackbar('修改的服务器内容已存在', 'error')
                return
            }

            netServerList.splice(key, 1)
            netServerList.unshift(newServer)
            const ok = await saveServerList(netServerList)
            if (!ok) {
                showSnackbar('修改失败', 'error')
            } else {
                setTimeout(() => navigate(`/server`), 100)
            }
        }
    }

    const {SnackbarComponent, showSnackbar} = useSnackbar()
    return !serverList ? (
        <LoadingCard/>
    ) : errorMsg ? (
        <ErrorCard errorMsg={errorMsg}/>
    ) : (<>
        <SnackbarComponent/>
        <Card>
            <PageHeader title="修改" backLink="/server"/>
            <Grid container spacing={2} sx={{p: 2, maxWidth: 800, m: 'auto'}}>
                <Grid size={12}>
                    <ToggleButtonGroup exclusive value={serverType} className="server-type">
                        <ToggleButton value="vmess">Vmess</ToggleButton>
                        <ToggleButton value="vless">Vless</ToggleButton>
                        <ToggleButton value="ss">Shadowsocks</ToggleButton>
                        <ToggleButton value="trojan">Trojan</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
                <Grid size={12} sx={{mt: 1, mb: 2}}>
                    <TextField
                        fullWidth size="small" label="服务器名称(postscript)"
                        value={ps}
                        error={psError} helperText={psError ? "服务器名称不能为空" : ""}
                        onChange={e => {
                            let v = e.target.value.trim()
                            setPsError(!v)
                            setPs(v)
                        }}/>
                </Grid>

                {serverType === 'vmess' && vmessForm ? (
                    <VmessForm
                        form={vmessForm}
                        errors={{addError, portError, idError, idNotUUID}}
                        handleChange={handleChange}
                        setFormData={setFormData}
                    />
                ) : serverType === 'vless' && vlessForm ? (
                    <VlessForm
                        form={vlessForm}
                        errors={{addError, portError, idError, idNotUUID}}
                        handleChange={handleChange}
                        setFormData={setFormData}
                    />
                ) : serverType === 'ss' && ssForm ? (
                    <SsForm
                        form={ssForm}
                        errors={{addError, portError, pwdError}}
                        handleChange={handleChange}
                        setFormData={setFormData}
                    />
                ) : serverType === 'trojan' && trojanForm && (
                    <TrojanForm
                        form={trojanForm}
                        errors={{addError, portError, pwdError}}
                        handleChange={handleChange}
                        setFormData={setFormData}
                    />
                )}

                <Grid size={12} sx={{mt: 2}}>
                    <Button variant="contained" fullWidth onClick={handleSubmit}>修改</Button>
                </Grid>
            </Grid>
        </Card>
    </>)
}

export default ServerUpdate
