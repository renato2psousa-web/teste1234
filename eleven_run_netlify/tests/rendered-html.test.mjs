import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("build Vite gera a página e referencia os assets compilados", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

  assert.match(html, /<title>Elevens Run<\/title>/i);
  assert.match(html, /<script[^>]+src="\/assets\/index-[^"]+\.js"/i);
  assert.match(html, /<link[^>]+href="\/assets\/index-[^"]+\.css"/i);
});
