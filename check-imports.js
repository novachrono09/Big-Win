import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appContent = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf-8');
const imports = appContent.match(/import\s+([A-Za-z0-9_]+)\s+from\s+'\.\/components\/([^']+)'/g);

console.log("Checking imports in App.tsx...");
console.log(imports);
