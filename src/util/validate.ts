import { isValidUUID, formatPort } from "./util.ts"

export function validateServerField(
    name: string,
    value: any,
    setAddError: (error: boolean) => void,
    setPortError: (error: boolean) => void,
    setIdError: (error: boolean) => void,
    setIdNotUUID: (error: boolean) => void,
    setPwdError: (error: boolean) => void
): any {
    if (name === 'add') {
        setAddError(!value)
    } else if (name === 'port') {
        value = formatPort(value)
        setPortError(!value)
    } else if (name === 'id') {
        let err = !value
        let idNotUUID = false
        if (!err) {
            err = !isValidUUID(value)
            if (err) idNotUUID = true
        }
        setIdError(err)
        setIdNotUUID(idNotUUID)
    } else if (name === 'pwd') {
        setPwdError(!value)
    }
    return value
}

export function validateServerRow(
    data: VmessRow | VlessRow | SsRow | TrojanRow | null,
    ps: string,
    setPsError: (error: boolean) => void,
    setAddError: (error: boolean) => void,
    setPortError: (error: boolean) => void,
    setIdError: (error: boolean) => void,
    setPwdError: (error: boolean) => void
): boolean {
    if (!data) return false

    let err = false
    if (!ps) {
        setPsError(true)
        err = true
    }
    if ("add" in data && !data.add) {
        setAddError(true)
        err = true
    }
    if ("port" in data && !data.port) {
        setPortError(true)
        err = true
    }
    if ("id" in data && !data.id) {
        setIdError(true)
        err = true
    }
    if ("pwd" in data && !data.pwd) {
        setPwdError(true)
        err = true
    }

    return !err
}
