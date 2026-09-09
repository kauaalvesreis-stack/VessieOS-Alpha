// Módulo crypto - Web Crypto API
async function deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('vessie-salt'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

export default function cryptoModule(kernel) {
    return {
        hash: async (data) => {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(data)));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        },
        encrypt: async (data, password) => {
            const key = await deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(data)));
            return { ciphertext: b64(ct), iv: b64(iv) };
        },
        decrypt: async (encrypted, password) => {
            const key = await deriveKey(password);
            const pt = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: unb64(encrypted.iv) }, key, unb64(encrypted.ciphertext));
            return new TextDecoder().decode(pt);
        },
        randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
        hmac: async (key, data) => {
            const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(key)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(String(data)));
            return b64(sig);
        }
    };
}