import { test } from 'node:test';
import assert from 'node:assert/strict';

for (const f of ['reservations', 'availability', 'availability-day']) {
  test(`la función de reservas ${f} carga como módulo ES`, async () => {
    const mod = await import(`../api/${f}.js`);
    assert.equal(typeof mod.default, 'function');
  });
}
