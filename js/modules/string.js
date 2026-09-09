// Módulo string
export default function stringModule(kernel) {
    return {
        length: (s) => String(s).length,
        substring: (s, start, end) => String(s).substring(start, end),
        split: (s, sep) => String(s).split(sep),
        join: (list, sep = ',') => (Array.isArray(list) ? list : []).join(sep),
        replace: (s, old, nw) => String(s).split(old).join(nw),
        trim: (s) => String(s).trim(),
        toUpper: (s) => String(s).toUpperCase(),
        toLower: (s) => String(s).toLowerCase(),
        indexOf: (s, sub) => String(s).indexOf(sub),
        lastIndexOf: (s, sub) => String(s).lastIndexOf(sub),
        charAt: (s, i) => String(s).charAt(i),
        includes: (s, sub) => String(s).includes(sub),
        repeat: (s, n) => String(s).repeat(n),
        reverse: (s) => String(s).split('').reverse().join(''),
        format: (s, ...args) => {
            let i = 0;
            return String(s).replace(/\{}/g, () => args[i++]);
        }
    };
}