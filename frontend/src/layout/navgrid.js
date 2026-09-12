/**
 * Generates navigation grid from layout specification. 0: navigable, 1: obstacle, 2: walkway.
 * Grid specifications mirrored across frontend and backend engines.
 */
export function buildNavGrid(layout, floor = 1) {
    const { cols, rows, cell_size: cs } = layout.grid;
    const cells = new Uint8Array(cols * rows);
    // Elevator shafts represent physical obstacles on each floor level.
    // Boarding and alighting routines use kinematic micro-moves outside of standard grid.
    // Shaft clearance envelope: covers 3.6m depth plus rotational safety margin.
    
    
    
    
    const blockLifts = () => {
        for (const l of layout.lifts ?? []) {
            const x = l.cell[0] + 0.5, z = l.cell[1] + 0.5;
            const c0 = Math.max(0, Math.floor((x - 1.4) / cs)), c1 = Math.min(cols - 1, Math.ceil((x + 1.4) / cs) - 1);
            const r0 = Math.max(0, Math.floor((z - 1.9) / cs)), r1 = Math.min(rows - 1, Math.ceil((z + 1.9) / cs) - 1);
            for (let r = r0; r <= r1; r++)
                for (let c = c0; c <= c1; c++)
                    cells[r * cols + c] = 1;
        }
    };
    if (floor !== 1) {
        // Level 2 (Mezzanine): areas outside platform footprint are blocked; racks marked as obstacles
        cells.fill(1);
        const fp = layout.floors.find((f) => f.id === floor)?.footprint;
        if (fp) {
            const xs = fp.map((p) => p[0]), zs = fp.map((p) => p[1]);
            const c0 = Math.max(0, Math.floor(Math.min(...xs) / cs)), c1 = Math.min(cols - 1, Math.ceil(Math.max(...xs) / cs) - 1);
            const r0 = Math.max(0, Math.floor(Math.min(...zs) / cs)), r1 = Math.min(rows - 1, Math.ceil(Math.max(...zs) / cs) - 1);
            for (let r = r0; r <= r1; r++)
                for (let c = c0; c <= c1; c++)
                    cells[r * cols + c] = 0;
        }
        for (const r of layout.racks)
            if (r.blocks_grid && (r.floor ?? 1) === floor) {
                const x0 = r.position[0], z0 = r.position[2], x1 = x0 + r.size[0], z1 = z0 + r.size[2];
                const c0 = Math.max(0, Math.floor(x0 / cs)), c1 = Math.min(cols - 1, Math.ceil(x1 / cs) - 1);
                const r0 = Math.max(0, Math.floor(z0 / cs)), r1 = Math.min(rows - 1, Math.ceil(z1 / cs) - 1);
                for (let rr = r0; rr <= r1; rr++)
                    for (let cc = c0; cc <= c1; cc++)
                        cells[rr * cols + cc] = 1;
            }
        blockLifts();
        return { cols, rows, cells };
    }
    const fillRect = (x0, z0, x1, z1, v) => {
        const c0 = Math.max(0, Math.floor(x0 / cs)), c1 = Math.min(cols - 1, Math.ceil(x1 / cs) - 1);
        const r0 = Math.max(0, Math.floor(z0 / cs)), r1 = Math.min(rows - 1, Math.ceil(z1 / cs) - 1);
        for (let r = r0; r <= r1; r++)
            for (let c = c0; c <= c1; c++)
                cells[r * cols + c] = v;
    };
    for (const w of layout.walkways) {
        const xs = w.polygon.map((p) => p[0]), zs = w.polygon.map((p) => p[1]);
        fillRect(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), 2);
    }
    for (const r of layout.racks)
        if (r.blocks_grid && (r.floor ?? 1) === 1)
            fillRect(r.position[0], r.position[2], r.position[0] + r.size[0], r.position[2] + r.size[2], 1);
    for (const c of layout.conveyors)
        if (c.blocks_grid) {
            for (let i = 0; i < c.path.length - 1; i++) {
                const [ax, az] = c.path[i], [bx, bz] = c.path[i + 1], hw = c.width / 2;
                fillRect(Math.min(ax, bx) - hw, Math.min(az, bz) - hw, Math.max(ax, bx) + hw, Math.max(az, bz) + hw, 1);
            }
        }
    for (const ra of layout.restricted_areas)
        if (!ra.robots_allowed)
            fillRect(ra.rect[0], ra.rect[1], ra.rect[2], ra.rect[3], 1);
    for (const s of layout.stations)
        fillRect(s.rect[0], s.rect[1], s.rect[2], s.rect[3], 1);
    // Mezzanine columns on Level 1: blocked with 0.9x0.9m obstacle footprint
    for (const [cx, cz] of layout.columns ?? [])
        fillRect(cx - 0.45, cz - 0.45, cx + 0.45, cz + 0.45, 1);
    // Structural pillars: blocked to match 3D physical layout
    for (const o of layout.obstacles ?? [])
        fillRect(o.rect[0], o.rect[1], o.rect[2], o.rect[3], 1);
    // Charging stations: cabinet footprint blocked to maintain south access aisle
    for (const c of layout.charging_stations)
        fillRect(c.position[0] - 0.45, c.position[2] - 0.4, c.position[0] + 0.45, c.position[2] + 0.5, 1);
    blockLifts();
    return { cols, rows, cells };
}
