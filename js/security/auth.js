// VessieOS - Autenticação
const STORAGE_KEY = 'vessie.auth';

export function initAuth() {
    const session = getSession();
    if (!session) {
        // Sessão padrão local (sistema single-user)
        saveSession({ user: 'admin', loginAt: Date.now() });
    }
    console.log('🔐 Auth inicializado:', getSession()?.user);
}

export function getSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

export function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function logout() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}

export function login(username) {
    saveSession({ user: username || 'admin', loginAt: Date.now() });
}