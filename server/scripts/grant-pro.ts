import 'dotenv/config';
import { grantPro } from '../src/db.js';

const clientId = process.argv[2];
const months = Number(process.argv[3] ?? 1);

if (!clientId) {
  console.error('Использование: npm run grant -- <clientId> [months]');
  process.exit(1);
}

const status = grantPro(clientId, months, 'admin');
console.log('Pro выдан:', status);