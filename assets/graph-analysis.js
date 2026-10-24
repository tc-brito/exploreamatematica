// Numerical intersections for the visible window; no symbolic execution.
export function findIntersections(curves, view) {
  const points = [],
    n = 600,
    span = view.xmax - view.xmin;
  const tolerance = Math.max(1e-10, (view.ymax - view.ymin) * 1e-9);
  for (let a = 0; a < curves.length; a++)
    for (let b = a + 1; b < curves.length; b++) {
      const f = curves[a].fn,
        g = curves[b].fn;
      if (!f || !g) continue;
      const diff = (x) => f(x) - g(x);
      const samples = Array.from({ length: n + 1 }, (_, i) => ({
        x: view.xmin + (span * i) / n,
      }));
      samples.forEach((p) => (p.d = diff(p.x)));
      if (
        samples.every((p) => Number.isFinite(p.d) && Math.abs(p.d) < tolerance)
      )
        continue;
      const add = (x) => {
        const y = f(x),
          z = g(x);
        if (
          !Number.isFinite(y) ||
          !Number.isFinite(z) ||
          Math.abs(y - z) > tolerance ||
          y < view.ymin ||
          y > view.ymax
        )
          return;
        const existing = points.find(
          (p) =>
            Math.abs(p.x - x) < span * 1e-7 &&
            Math.abs(p.y - y) < tolerance * 100,
        );
        const names = [
          curves[a].name || String(a + 1),
          curves[b].name || String(b + 1),
        ];
        if (existing)
          existing.names = [...new Set([...existing.names, ...names])];
        else if (points.length < 200)
          points.push({ x, y, names, color: curves[a].color });
      };
      for (const x of [
        curves[a].domainMin,
        curves[a].domainMax,
        curves[b].domainMin,
        curves[b].domainMax,
      ])
        if (Number.isFinite(x) && x >= view.xmin && x <= view.xmax) add(x);
      for (let i = 0; i < n; i++) {
        const p = samples[i],
          q = samples[i + 1];
        if (!Number.isFinite(p.d) || !Number.isFinite(q.d)) continue;
        if (p.d * q.d < 0) {
          let lo = p.x,
            hi = q.x,
            dlo = p.d;
          for (let k = 0; k < 55; k++) {
            const mid = (lo + hi) / 2,
              d = diff(mid);
            if (!Number.isFinite(d)) break;
            if (d === 0) {
              lo = hi = mid;
              break;
            }
            if (Math.sign(d) === Math.sign(dlo)) {
              lo = mid;
              dlo = d;
            } else hi = mid;
          }
          add((lo + hi) / 2);
        }
      }
      for (let i = 0; i <= n; i++) {
        const p = samples[i],
          prev = samples[i - 1],
          next = samples[i + 1];
        if (p.d === 0 && (!prev || prev.d !== 0) && (!next || next.d !== 0))
          add(p.x);
        // A local minimum of |f-g| catches touching curves without a sign change.
        if (
          prev &&
          next &&
          Number.isFinite(p.d) &&
          Math.abs(p.d) < Math.abs(prev.d) &&
          Math.abs(p.d) < Math.abs(next.d)
        ) {
          let lo = prev.x,
            hi = next.x;
          for (let k = 0; k < 60; k++) {
            const x1 = lo + (hi - lo) / 3,
              x2 = hi - (hi - lo) / 3;
            if (Math.abs(diff(x1)) < Math.abs(diff(x2))) hi = x2;
            else lo = x1;
          }
          add((lo + hi) / 2);
        }
      }
    }
  return points.sort((a, b) => a.x - b.x);
}

export function findSpecialPoints(curves, view, kind = "intersections") {
  if (kind === "intersections")
    return findIntersections(curves, view).map((p) => ({
      ...p,
      kind: "Interseção",
      description: p.names.join(" ∩ "),
    }));
  if (kind === "roots")
    return curves.flatMap((c) =>
      findIntersections([c, { fn: () => 0, name: "eixo x" }], view).map(
        (p) => ({ ...p, kind: "Zero", description: c.name }),
      ),
    );
  const result = [],
    n = 600,
    dx = (view.xmax - view.xmin) / n;
  for (const c of curves) {
    const values = Array.from({ length: n + 1 }, (_, i) =>
      c.fn(view.xmin + i * dx),
    );
    for (let i = 1; i < n; i++) {
      const a = values[i - 1],
        b = values[i],
        d = values[i + 1];
      if (![a, b, d].every(Number.isFinite)) continue;
      const sign = b < a && b < d ? 1 : b > a && b > d ? -1 : 0;
      if (!sign) continue;
      let lo = view.xmin + (i - 1) * dx,
        hi = lo + 2 * dx;
      for (let j = 0; j < 60; j++) {
        const x1 = lo + (hi - lo) / 3,
          x2 = hi - (hi - lo) / 3;
        if (sign * c.fn(x1) < sign * c.fn(x2)) hi = x2;
        else lo = x1;
      }
      const x = (lo + hi) / 2,
        y = c.fn(x),
        eps = dx * 0.01,
        yl = c.fn(x - eps),
        yr = c.fn(x + eps);
      if (
        ![y, yl, yr].every(Number.isFinite) ||
        y < view.ymin ||
        y > view.ymax ||
        !(sign * (yl - y) > 0 && sign * (yr - y) > 0)
      )
        continue;
      if (
        !result.some(
          (p) => p.description === c.name && Math.abs(p.x - x) < dx * 0.01,
        )
      )
        result.push({
          x,
          y,
          kind: sign === 1 ? "Mínimo" : "Máximo",
          description: c.name,
        });
      if (result.length >= 100) return result;
    }
  }
  return result.sort((a, b) => a.x - b.x);
}
