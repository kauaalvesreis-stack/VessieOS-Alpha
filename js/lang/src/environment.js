// VessieLang Environment - escopos léxicos
export class Environment {
    constructor(parent = null) {
        this.vars = new Map();
        this.parent = parent;
    }
    get(name) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) return env.vars.get(name);
            env = env.parent;
        }
        return undefined;
    }
    has(name) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) return true;
            env = env.parent;
        }
        return false;
    }
    set(name, value) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) { env.vars.set(name, value); return; }
            env = env.parent;
        }
        this.vars.set(name, value);
    }
    define(name, value) { this.vars.set(name, value); return value; }
    delete(name) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) { env.vars.delete(name); return true; }
            env = env.parent;
        }
        return false;
    }
    keys() { return Array.from(this.vars.keys()); }
    scopeView() { return new Map(this.vars); }
    static global() { return new Environment(null); }
}

export function mergeEnvironments(...envs) {
    const merged = new Environment();
    for (const env of envs) {
        if (env && env.vars instanceof Map) {
            for (const [k, v] of env.vars) merged.vars.set(k, v);
        }
    }
    return merged;
