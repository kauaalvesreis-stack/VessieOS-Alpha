// Módulo color
function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to255 = x => Math.round(255 * x).toString(16).padStart(2, '0');
    return '#' + to255(f(0)) + to255(f(8)) + to255(f(4));
}

export default function colorModule(kernel) {
    return {
        rgb: (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''),
        hsl: (h, s, l) => hslToHex(h, s, l),
        contrast: (hex) => {
            const h = hex.replace('#', '');
            const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            return lum > 0.5 ? '#000000' : '#FFFFFF';
        },
        random: () => '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')
    };
}