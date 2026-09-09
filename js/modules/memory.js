// Módulo memory - gerenciamento avançado de memória
export default function memoryModule(kernel) {
    const pools = new Map();
    let poolId = 0;

    return {
        pool_create(size = 65536) {
            const id = ++poolId;
            const pool = { id, size, buffer: new ArrayBuffer(size), used: 0 };
            pools.set(id, pool);
            return id;
        },
        pool_alloc(id, size) {
            const pool = pools.get(id);
            if (!pool) throw new Error('ErroDeMemoria: pool não encontrado');
            if (pool.used + size > pool.size) throw new Error('ErroDeMemoria: pool cheio');
            const ptr = pool.used;
            pool.used += size;
            return ptr;
        },
        pool_free(id, ptr) {
            // Pool de bump allocator: liberação total apenas
            const pool = pools.get(id);
            return !!pool;
        },
        gc_collect() {
            pools.forEach((pool, id) => {
                // Reaproveita pools quase vazios
                if (pool.used === 0) pools.delete(id);
            });
            return { pools: pools.size };
        },
        usage() {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.jsHeapSizeLimit,
                    pools: pools.size
                };
            }
            let total = 0;
            pools.forEach(p => total += p.size);
            return { used: total, total: 512 * 1024 * 1024, pools: pools.size };
        }
    };
}