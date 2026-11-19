"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");

let server, base;
test.before(async () => {
  await new Promise((resolve) => {
    server = createApp().listen(0, () => { base = "http://127.0.0.1:" + server.address().port; resolve(); });
  });
});
test.after(() => server.close());

test("GET /health responde ok", async () => {
  const r = await fetch(base + "/health");
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).status, "ok");
});

test("GET / entrega a landing page com cabeçalhos de segurança", async () => {
  const r = await fetch(base + "/");
  assert.strictEqual(r.status, 200);
  assert.match(await r.text(), /LEVA EU/);
  assert.ok(r.headers.get("content-security-policy"));
  assert.ok(r.headers.get("strict-transport-security"));
  assert.strictEqual(r.headers.get("x-powered-by"), null);
});

test("arquivos do servidor e do repositório não são públicos", async () => {
  for (const p of ["/server.js", "/package.json", "/.git/config", "/.github/workflows/azure-deploy.yml", "/node_modules/express/package.json"]) {
    const r = await fetch(base + p);
    assert.strictEqual(r.status, 404, p + " deveria ser 404");
  }
});

test("assets públicos funcionam", async () => {
  for (const p of ["/css/style.css", "/js/app.js", "/config.js"]) {
    assert.strictEqual((await fetch(base + p)).status, 200, p);
  }
});
