import { MlKem768 } from 'mlkem'

const sessions = new Map()

function key(serverId, nick) { return `${serverId}:${nick}` }
export function hasSession(s, n) { return sessions.has(key(s, n)) }
export function getSession(s, n) { return sessions.get(key(s, n)) }
export function deleteSession(s, n) { sessions.delete(key(s, n)) }

async function deriveKey(x25519Bits, mlkemSecret) {
    const combined = new Uint8Array(x25519Bits.byteLength + mlkemSecret.length)
    combined.set(new Uint8Array(x25519Bits))
    combined.set(mlkemSecret, x25519Bits.byteLength)
    const mat = await crypto.subtle.importKey('raw', combined, { name: 'HKDF' }, false, ['deriveKey'])
    return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('birc-e2e') },
        mat, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    )
}

export async function initiateHandshake(serverId, nick) {
    const kem = new MlKem768()
    const [kemPub, kemPriv] = await kem.generateKeyPair()

    const x25519Pair = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])
    const x25519PubRaw = await crypto.subtle.exportKey('raw', x25519Pair.publicKey)

    sessions.set(key(serverId, nick), {
        state: 'pending', kemPriv,
        x25519Priv: x25519Pair.privateKey,
    })

    return btoa(JSON.stringify({
        kem: btoa(String.fromCharCode(...kemPub)),
        x:   btoa(String.fromCharCode(...new Uint8Array(x25519PubRaw))),
    }))
}

export async function receiveInit(serverId, nick, payloadB64) {
    const { kem: kemB64, x: xB64 } = JSON.parse(atob(payloadB64))
    const kemPub  = Uint8Array.from(atob(kemB64), c => c.charCodeAt(0))
    const xPubRaw = Uint8Array.from(atob(xB64),   c => c.charCodeAt(0))

    const kem = new MlKem768()
    const [kemCt, mlkemSecret] = await kem.encap(kemPub)

    const x25519Pair = await crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])
    const theirPub   = await crypto.subtle.importKey('raw', xPubRaw, { name: 'X25519' }, true, [])
    const x25519Bits = await crypto.subtle.deriveBits({ name: 'X25519', public: theirPub }, x25519Pair.privateKey, 256)
    const x25519PubRaw = await crypto.subtle.exportKey('raw', x25519Pair.publicKey)

    const cryptoKey = await deriveKey(x25519Bits, mlkemSecret)
    sessions.set(key(serverId, nick), { state: 'active', sharedKey: cryptoKey })

    return btoa(JSON.stringify({
        kem: btoa(String.fromCharCode(...kemCt)),
        x:   btoa(String.fromCharCode(...new Uint8Array(x25519PubRaw))),
    }))
}

export async function receiveFinish(serverId, nick, payloadB64) {
    const session = sessions.get(key(serverId, nick))
    if (!session || session.state !== 'pending') return false

    const { kem: kemB64, x: xB64 } = JSON.parse(atob(payloadB64))
    const kemCt   = Uint8Array.from(atob(kemB64), c => c.charCodeAt(0))
    const xPubRaw = Uint8Array.from(atob(xB64),   c => c.charCodeAt(0))

    const kem = new MlKem768()
    const mlkemSecret = await kem.decap(kemCt, session.kemPriv)

    const theirPub   = await crypto.subtle.importKey('raw', xPubRaw, { name: 'X25519' }, true, [])
    const x25519Bits = await crypto.subtle.deriveBits({ name: 'X25519', public: theirPub }, session.x25519Priv, 256)

    session.sharedKey  = await deriveKey(x25519Bits, mlkemSecret)
    session.state      = 'active'
    session.kemPriv    = null
    session.x25519Priv = null
    return true
}

export async function encrypt(serverId, nick, plaintext) {
    const session = getSession(serverId, nick)
    if (!session?.sharedKey) return null
    const iv  = crypto.getRandomValues(new Uint8Array(12))
    const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.sharedKey, new TextEncoder().encode(plaintext))
    const out = new Uint8Array(12 + enc.byteLength)
    out.set(iv); out.set(new Uint8Array(enc), 12)
    return btoa(String.fromCharCode(...out))
}

export async function decrypt(serverId, nick, b64) {
    const session = getSession(serverId, nick)
    if (!session?.sharedKey) return null
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    try {
        const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0,12) }, session.sharedKey, buf.slice(12))
        return new TextDecoder().decode(dec)
    } catch { return null }
}
