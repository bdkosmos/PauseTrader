import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'pausetrader.json');

export type PlanId = 'free' | 'pro';

export interface UserRow {
  client_id: string;
  plan: PlanId;
  expires_at: number | null;
  source: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email: string | null;
  telegram_chat_id: string | null;
  created_at: number;
  updated_at: number;
}

interface LicenseRow {
  license_key: string;
  months: number;
  used_by: string | null;
  used_at: number | null;
  created_at: number;
  note: string | null;
}

interface AlertRow {
  id: string;
  client_id: string;
  symbol: string;
  base: string;
  price: number;
  direction: string;
  triggered: number;
  created_at: number;
}

interface Database {
  users: Record<string, UserRow>;
  licenses: Record<string, LicenseRow>;
  alerts: Record<string, AlertRow>;
}

const defaultDb = (): Database => ({ users: {}, licenses: {}, alerts: {} });

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function loadDb(): Database {
  ensureDataDir();
  if (!fs.existsSync(dbPath)) {
    const db = defaultDb();
    saveDb(db);
    return db;
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8')) as Database;
  } catch {
    return defaultDb();
  }
}

function saveDb(db: Database) {
  ensureDataDir();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

function mutate<T>(fn: (db: Database) => T): T {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}

function now() {
  return Date.now();
}

function isActive(user: UserRow | undefined): boolean {
  if (!user) return false;
  if (user.plan !== 'pro') return false;
  if (!user.expires_at) return true;
  return user.expires_at > now();
}

export function getOrCreateUser(clientId: string): UserRow {
  return mutate((db) => {
    if (db.users[clientId]) return db.users[clientId];

    const ts = now();
    const user: UserRow = {
      client_id: clientId,
      plan: 'free',
      expires_at: null,
      source: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      email: null,
      telegram_chat_id: null,
      created_at: ts,
      updated_at: ts,
    };
    db.users[clientId] = user;
    return user;
  });
}

export function getSubscriptionStatus(clientId: string) {
  const db = loadDb();
  const user = db.users[clientId] ?? getOrCreateUser(clientId);
  const active = isActive(user);

  if (!active && user.plan === 'pro') {
    mutate((d) => {
      const u = d.users[clientId];
      if (u) {
        u.plan = 'free';
        u.updated_at = now();
      }
    });
  }

  return {
    plan: active ? ('pro' as PlanId) : ('free' as PlanId),
    expiresAt: user.expires_at,
    source: user.source,
    email: user.email,
    hasTelegram: Boolean(user.telegram_chat_id),
  };
}

function ensureUserInDb(db: Database, clientId: string): UserRow {
  if (db.users[clientId]) return db.users[clientId];
  const ts = now();
  const user: UserRow = {
    client_id: clientId,
    plan: 'free',
    expires_at: null,
    source: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    email: null,
    telegram_chat_id: null,
    created_at: ts,
    updated_at: ts,
  };
  db.users[clientId] = user;
  return user;
}

export function grantPro(
  clientId: string,
  months: number,
  source: 'license' | 'admin' | 'stripe',
  extra?: {
    expiresAt?: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    email?: string;
  },
) {
  mutate((db) => {
    const user = ensureUserInDb(db, clientId);
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const from = Math.max(user.expires_at ?? 0, now());
    const expiresAt = extra?.expiresAt ?? from + months * monthMs;

    user.plan = 'pro';
    user.expires_at = expiresAt;
    user.source = source;
    if (extra?.stripeCustomerId) user.stripe_customer_id = extra.stripeCustomerId;
    if (extra?.stripeSubscriptionId) user.stripe_subscription_id = extra.stripeSubscriptionId;
    if (extra?.email) user.email = extra.email;
    user.updated_at = now();
    db.users[clientId] = user;
  });

  return getSubscriptionStatus(clientId);
}

export function revokePro(clientId: string) {
  mutate((db) => {
    const user = db.users[clientId];
    if (!user) return;
    user.plan = 'free';
    user.expires_at = null;
    user.updated_at = now();
  });
}

export function setStripeSubscription(
  clientId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  expiresAt: number,
  email?: string,
) {
  return grantPro(clientId, 0, 'stripe', {
    expiresAt,
    stripeCustomerId,
    stripeSubscriptionId,
    email,
  });
}

export function findUserByStripeCustomer(stripeCustomerId: string) {
  const db = loadDb();
  return Object.values(db.users).find((u) => u.stripe_customer_id === stripeCustomerId);
}

export function findUserByStripeSubscription(subscriptionId: string) {
  const db = loadDb();
  return Object.values(db.users).find((u) => u.stripe_subscription_id === subscriptionId);
}

export function createLicense(months: number, note?: string) {
  const key = generateLicenseKey();
  mutate((db) => {
    db.licenses[key] = {
      license_key: key,
      months,
      used_by: null,
      used_at: null,
      created_at: now(),
      note: note ?? null,
    };
  });
  return key;
}

export function activateLicense(clientId: string, licenseKey: string) {
  const normalized = licenseKey.trim().toUpperCase();
  const db = loadDb();
  const license = db.licenses[normalized];

  if (!license) return { ok: false as const, error: 'Неверный ключ' };
  if (license.used_by && license.used_by !== clientId) {
    return { ok: false as const, error: 'Ключ уже использован' };
  }

  mutate((d) => {
    const lic = d.licenses[normalized];
    if (!lic.used_by) {
      lic.used_by = clientId;
      lic.used_at = now();
    }
  });

  const status = grantPro(clientId, license.months, 'license');
  return { ok: true as const, status };
}

function generateLicenseKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PT-${part()}-${part()}-${part()}`;
}

export function linkTelegram(clientId: string, chatId: string) {
  mutate((db) => {
    const user = ensureUserInDb(db, clientId);
    user.telegram_chat_id = chatId;
    user.updated_at = now();
    db.users[clientId] = user;
  });
}

export function getTelegramChatId(clientId: string) {
  const user = getOrCreateUser(clientId);
  return user.telegram_chat_id;
}

export function saveAlert(
  id: string,
  clientId: string,
  symbol: string,
  base: string,
  price: number,
  direction: 'above' | 'below',
) {
  mutate((db) => {
    db.alerts[id] = {
      id,
      client_id: clientId,
      symbol,
      base,
      price,
      direction,
      triggered: 0,
      created_at: now(),
    };
  });
}

export function getActiveAlerts() {
  const db = loadDb();
  return Object.values(db.alerts).filter((a) => a.triggered === 0);
}

export function markAlertTriggered(id: string) {
  mutate((db) => {
    if (db.alerts[id]) db.alerts[id].triggered = 1;
  });
}