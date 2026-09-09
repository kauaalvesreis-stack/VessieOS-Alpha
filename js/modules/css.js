// Módulo css - auto-estilização
const styleEl = document.createElement('style');
document.head.appendChild(styleEl);

export default function cssModule(kernel) {
    return {
        autoStyle(component) {
            const el = component && component.el ? component.el : component;
            if (el instanceof HTMLElement) {
                if (el.tagName === 'BUTTON' && !el.className) el.className = 'gui-button';
                else if ((el.tagName === 'INPUT' || el.tagName === 'SELECT') && !el.className) el.className = 'gui-textbox';
                else if (!el.className) el.className = 'gui-label';
            }
            return component;
        },
        setTheme(themeName) {
            const link = document.getElementById('themeStyle');
            if (!link) return false;
            const map = {
                dark: 'css/theme-dark.css',
                light: 'css/theme-light.css',
                highContrast: 'css/theme-highcontrast.css'
            };
            const href = map[themeName];
            if (!href) return false;
            link.href = href;
            localStorage.setItem('vessie.theme', themeName);
            return true;
        },
        customRule(selector, styles) {
            try { styleEl.sheet.insertRule(`${selector} { ${styles} }`, styleEl.sheet.cssRules.length); return true; }
            catch (e) { throw new Error('ErroDeCSS: regra inválida'); }
        },
        detectAndFix() {
            let fixed = 0;
            document.querySelectorAll('button:not([class])').forEach(b => { b.className = 'gui-button'; fixed++; });
            document.querySelectorAll('input[type=text]:not([class])').forEach(i => { i.className = 'gui-textbox'; fixed++; });
            return fixed;
        }
    };
}