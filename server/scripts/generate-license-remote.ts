import 'dotenv/config';

const API_URL = (process.env.PAUSE_API_URL ?? 'https://pausetrader-api.onrender.com').replace(
  /\/$/,
  '',
);
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';
const months = Number(process.argv[2] ?? 1);
const note = process.argv[3] ?? 'manual';

if (!ADMIN_SECRET) {
  console.error('Задай ADMIN_SECRET в server/.env');
  process.exit(1);
}

const res = await fetch(`${API_URL}/api/v1/admin/license/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: ADMIN_SECRET, months, note }),
});

const data = (await res.json().catch(() => ({}))) as {
  licenseKey?: string;
  months?: number;
  error?: string;
};

if (!res.ok) {
  console.error(data.error ?? `HTTP ${res.status}`);
  process.exit(1);
}

console.log('');
console.log('  Лицензионный ключ PauseTrader Pro (production)');
console.log('  ===============================================');
console.log(`  Ключ:   ${data.licenseKey}`);
console.log(`  Срок:   ${data.months ?? months} мес.`);
console.log(`  API:    ${API_URL}`);
console.log('');
console.log('  Отдай ключ пользователю — он введёт его в приложении.');
console.log('');