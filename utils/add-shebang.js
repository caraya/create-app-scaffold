#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// eslint-disable-next-line no-undef
const out = resolve(process.cwd(), 'dist/cli.js');
const js  = readFileSync(out, 'utf8');
writeFileSync(out, '#!/usr/bin/env node\n' + js);
