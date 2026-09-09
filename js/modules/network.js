// Módulo network - rede
export default function networkModule(kernel) {
    return {
        fetch: (url, options = {}) => fetch(url, options)
            .then(res => res.text().then(body => ({ status: res.status, headers: Object.fromEntries(res.headers), body }))),
        ping: (host) => navigator.onLine,
        ip: () => '192.168.0.' + (Math.floor(Math.random() * 200) + 10),
        status: () => navigator.onLine ? 'online' : 'offline',
        wsConnect: (url) => {
            const ws = new WebSocket(url);
            const handlers = [];
            ws.onmessage = e => handlers.forEach(h => h(e.data));
            return {
                send: (msg) => ws.send(msg),
                onMessage: (cb) => handlers.push(cb),
                close: () => ws.close()
            };
        },
        broadcast: (channel, message) => {
            const bc = new BroadcastChannel('vessie.' + channel);
            bc.postMessage(message);
            bc.close();
            return true;
        },
        onBroadcast: (channel, callback) => {
            const bc = new BroadcastChannel('vessie.' + channel);
            bc.onmessage = e => callback(e.data);
            return bc;
        }
    };
}