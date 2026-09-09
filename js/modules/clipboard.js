// Módulo clipboard
export default function clipboardModule(kernel) {
    return {
        copy: async (text) => {
            try { await navigator.clipboard.writeText(String(text)); return true; }
            catch (e) {
                const ta = document.createElement('textarea');
                ta.value = String(text);
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                return true;
            }
        },
        paste: async () => {
            try { return await navigator.clipboard.readText(); }
            catch (e) { return null; }
        }
    };
}