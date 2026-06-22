import 'dotenv/config';
import { createLicense } from '../src/db.js';

const months = Number(process.argv[2] ?? 1);
const note = process.argv[3] ?? 'manual';

if (!process.env.ADMIN_SECRET) {
  console.error('Задай ADMIN_SECRET в server/.env');
  process.exit(1);
}

const key = createLicense(months, note);
console.log('');
console.log('  Лицензионный ключ PauseTrader Pro');
console.log('  =================================');
console.log(`  Ключ:   ${key}`);
console.log(`  Срок:   ${months} мес.`);
console.log('');
console.log('  Отдай ключ пользователю — он введёт его в приложении.');
console.log('');