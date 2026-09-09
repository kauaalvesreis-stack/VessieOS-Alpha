// VessieOS - Compressão simples (RLE) para arquivos repetitivos
export function compress(text) {
    const s = String(text);
    let out = '';
    let i = 0;
    while (i < s.length) {
        let count = 1;
        while (i + count < s.length && s[i + count] === s[i] && count < 255) count++;
        out += count > 2 ? `\x00${count}${s[i]}` : s[i].repeat(count);
        i += count;
    }
    return out;
}

export function decompress(data) {
    const s = String(data);
    let out = '';
    let i = 0;
    while (i < s.length) {
        if (s[i] === '\x00') {
            const count = parseInt(s.slice(i + 1), 10);
            out += s[i + String(count).length + 1].repeat(count);
            i += String(count).length + 2;
        } else {
            out += s[i];
            i++;
        }
    }
    return out;
}

// Compressão assíncrona via CompressionStream, quando disponível
export async function compressAsync(text) {
    if (typeof CompressionStream === 'undefined') return compress(text);
    const cs = new CompressionStream('deflate-raw');
    const blob = new Blob([text]);
    const stream = blob.stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export async function decompressAsync(data) {
    if (typeof DecompressionStream === 'undefined') return decompress(data);
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return await new Response(stream).text();
}