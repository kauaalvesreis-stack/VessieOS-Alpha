// Módulo gui - Interface gráfica para scripts .vl
import { createWindow } from '../ui/windowManager.js';

function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
}

export default function guiModule(kernel) {
    return {
        createWindow(title, width = 480, height = 360) {
            const win = createWindow({ title, width, height });
            const body = win.el.querySelector('.window-body');
            const api = {
                _win: win,
                _body: body,
                setTitle(t) { win.el.querySelector('.window-title').textContent = t; },
                setSize(w, h) { win.el.style.width = w + 'px'; win.el.style.height = h + 'px'; },
                setPosition(x, y) { win.el.style.left = x + 'px'; win.el.style.top = y + 'px'; },
                add(component) { body.appendChild(component.el || component); return api; },
                show() { win.el.style.display = 'flex'; return api; },
                hide() { win.el.style.display = 'none'; return api; },
                close() { win.close(); },
                onClose(cb) { win.onClose = cb; },
                onResize(cb) {
                    new ResizeObserver(entries => cb(body.clientWidth, body.clientHeight)).observe(win.el);
                }
            };
            win.el.style.display = 'flex';
            return api;
        },
        alert(msg) { kernel.notify('Aviso', msg, '⚠️'); },
        confirm(msg) { return window.confirm(msg); },
        prompt(msg, def = '') { return window.prompt(msg, def); },
        notify(title, body, icon = '🔔') { kernel.notify(title, body, icon); },
        print(...args) { kernel.write(args.map(String).join(' ')); },

        // Componentes
        button(text, onClick = null) {
            const b = el('button', 'gui-button', text);
            if (onClick) b.addEventListener('click', () => onClick());
            return { el: b, setText(t) { b.textContent = t; } };
        },
        textBox(label, value = '') {
            const wrap = el('div');
            if (label) wrap.appendChild(el('label', 'gui-label', label));
            const input = el('input', 'gui-textbox');
            input.value = value;
            wrap.appendChild(input);
            return {
                el: wrap,
                setText(v) { input.value = v; },
                getText() { return input.value; },
                setEditable(ro) { input.readOnly = !!ro; }
            };
        },
        checkBox(label, checked = false, onChange = null) {
            const wrap = el('label', 'gui-checkbox');
            const input = el('input');
            input.type = 'checkbox';
            input.checked = checked;
            wrap.appendChild(input);
            wrap.appendChild(el('span', null, label));
            if (onChange) input.addEventListener('change', () => onChange(input.checked));
            return { el: wrap, setChecked(v) { input.checked = v; }, isChecked() { return input.checked; } };
        },
        dropdown(options = [], onChange = null) {
            const sel = el('select', 'gui-dropdown');
            for (const opt of options) {
                const o = el('option', null, String(opt));
                o.value = opt;
                sel.appendChild(o);
            }
            if (onChange) sel.addEventListener('change', () => onChange(sel.value));
            return { el: sel, getValue() { return sel.value; }, setValue(v) { sel.value = v; } };
        },
        list(items = [], onSelect = null) {
            const ul = el('ul', 'gui-list');
            ul.style.cssText = 'list-style:none;max-height:200px;overflow:auto;border:1px solid rgba(255,255,255,0.1);border-radius:6px;';
            for (const item of items) {
                const li = el('li', null, String(item));
                li.style.cssText = 'padding:4px 10px;cursor:pointer;';
                li.addEventListener('mouseenter', () => li.style.background = 'rgba(255,255,255,0.08)');
                li.addEventListener('mouseleave', () => li.style.background = 'transparent');
                if (onSelect) li.addEventListener('click', () => onSelect(item));
                ul.appendChild(li);
            }
            return { el: ul, setItems(arr) {
                ul.innerHTML = '';
                for (const item of arr) {
                    const li = el('li', null, String(item));
                    li.style.cssText = 'padding:4px 10px;cursor:pointer;';
                    li.addEventListener('click', () => onSelect && onSelect(item));
                    ul.appendChild(li);
                }
            } };
        },
        panel() {
            const p = el('div', 'gui-panel');
            p.style.cssText = 'width:100%;';
            return {
                el: p,
                add(c) { p.appendChild(c.el || c); return this; },
                setStyle(css) { p.style.cssText = css; return this; }
            };
        },
        label(text) {
            const l = el('div', 'gui-label', text);
            return { el: l, setText(t) { l.textContent = t; } };
        },
        image(src, width = 100, height = 100) {
            const img = el('img');
            img.src = src;
            img.style.cssText = `width:${width}px;height:${height}px;object-fit:contain;`;
            return { el: img, setSrc(s) { img.src = s; } };
        },
        canvas(width = 300, height = 150) {
            const c = el('canvas');
            c.width = width; c.height = height;
            c.style.cssText = 'border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:#000;';
            return {
                el: c,
                getContext() { return c.getContext('2d'); },
                setSize(w, h) { c.width = w; c.height = h; }
            };
        },
        progressBar(value = 0) {
            const wrap = el('div', 'gui-progress');
            const bar = el('div', 'gui-progress-bar');
            bar.style.width = Math.max(0, Math.min(100, value)) + '%';
            wrap.appendChild(bar);
            return { el: wrap, setValue(v) { bar.style.width = Math.max(0, Math.min(100, v)) + '%'; } };
        },
        openFileDialog(filter = '*') {
            return new Promise(resolve => {
                const input = document.createElement('input');
                input.type = 'file';
                if (filter !== '*') input.accept = filter;
                input.onchange = () => {
                    const f = input.files[0];
                    if (!f) return resolve(null);
                    const reader = new FileReader();
                    reader.onload = () => resolve({ name: f.name, size: f.size, content: reader.result });
                    reader.readAsText(f);
                };
                input.click();
            });
        },
        saveFileDialog(name = 'arquivo.txt', content = '') {
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            return true;
        }
    };
}