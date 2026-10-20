// Comprobación mínima: las dos lenguas tienen las mismas claves y no falta ninguna usada en el código.
import { readFileSync, readdirSync } from "node:fs";

const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const en = new Set(flat(JSON.parse(readFileSync("lang/en.json", "utf8"))));
const es = new Set(flat(JSON.parse(readFileSync("lang/es.json", "utf8"))));

const fallos = [];
for (const k of en) if (!es.has(k)) fallos.push(`falta en es.json: ${k}`);
for (const k of es) if (!en.has(k)) fallos.push(`falta en en.json: ${k}`);

const fuentes = [
  ...readdirSync("scripts").map(f => `scripts/${f}`),
  ...readdirSync("templates").map(f => `templates/${f}`)
].map(f => readFileSync(f, "utf8")).join("\n");
for (const k of new Set(fuentes.match(/PCP\.[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+/g))) {
  if (!es.has(k)) fallos.push(`clave usada y sin definir: ${k}`);
}

if (fallos.length) {
  console.error(fallos.join("\n"));
  process.exit(1);
}
console.log(`Traducciones correctas (${es.size} claves).`);
