#!/usr/bin/env node

/**
 * Sync schemas script
 * Copies shared schemas from src/shared/ to packages/opencode-plugin/src/
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourcePath = join(__dirname, '..', 'src', 'shared', 'schemas.ts');
const targetPath = join(__dirname, '..', 'packages', 'opencode-plugin', 'src', 'schemas.ts');

// Ensure target directory exists
mkdirSync(dirname(targetPath), { recursive: true });

// Copy the file
const content = readFileSync(sourcePath, 'utf8');
writeFileSync(targetPath, content);

console.log('✅ Schemas synced successfully!');