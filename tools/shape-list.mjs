// The lists of shapes in the docs, made from the shape library:
//   docs/shapes.md       every shape by name, tab by tab, under the headings the picker shows
//   the table in README  one row per tab (printed here, to paste under "Shapes")
// Run with: node tools/shape-list.mjs   (the tests check that both are up to date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHAPES, CATEGORIES } from '../js/shapes.js';

const inTab = (tab) => SHAPES.filter((s) => s.cat === tab.id);
const names = (list) => list.map((s) => s.name).join(', ');

/** The table of tabs in the README. */
export function shapeTable() {
  const rows = CATEGORIES.map((tab) => {
    const list = inTab(tab);
    const top = list.filter((s) => !s.sub).length;
    const parts = tab.subs.map((sub) => `${sub} ${list.filter((s) => s.sub === sub).length}`);
    if (top) parts.unshift(`${top} at the top`);
    return `| ${tab.name} | ${list.length} | ${parts.join('; ')} |`;
  });
  return ['| Tab | How many | Under these headings |', '|---|---|---|', ...rows].join('\n');
}

/** docs/shapes.md as text. */
export function shapeList() {
  const lines = [
    `# All ${SHAPES.length} shapes`,
    '',
    'Every shape of the **+ Add** panel, tab by tab, under the headings the tab shows.',
    'In the studio, type a name in the search box to find a shape quickly.',
    '',
    'This page is made by `tools/shape-list.mjs`. Do not edit it by hand.',
    '',
  ];
  for (const tab of CATEGORIES) {
    const list = inTab(tab);
    lines.push(`## ${tab.name} (${list.length})`, '');
    const top = list.filter((s) => !s.sub);
    if (top.length) lines.push(names(top), '');
    for (const sub of tab.subs) {
      const under = list.filter((s) => s.sub === sub);
      lines.push(`**${sub}** (${under.length}): ${names(under)}`, '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(path.join(here, '../docs/shapes.md'), shapeList());
  console.log(`Wrote docs/shapes.md (${SHAPES.length} shapes). The table for the README:\n`);
  console.log(shapeTable());
}
