/**
 * UDCSP mobile — Offline write queue
 *
 * Citizens who fill out a long form offline (boat, train, rural area) must
 * not lose their input. This in-process queue persists pending mutations to
 * AsyncStorage with a per-mutation idempotency key. On `flush()` (called when
 * the network reappears or on next cold start) the queue replays mutations
 * sequentially against the API.
 *
 * Design choices:
 *   - AsyncStorage (not SQLite) — small payloads, citizen-grade UX.
 *   - Idempotency key = uuidv4 stamped at enqueue, so server-side replay is
 *     safe (server returns 200 if already applied).
 *   - Encryption-at-rest is provided by the OS keystore via
 *     expo-secure-store for the JWT only; form bodies use AsyncStorage which
 *     is sandboxed by the OS but **not** end-to-end encrypted. Sensitive
 *     bodies (national ID, eligibility evidence) are NOT enqueued offline —
 *     the form gates them behind biometric + online (`BiometricGate`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

const KEY = 'udcsp.offline.queue.v1';

export interface PendingMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  enqueuedAt: number;
  attempts: number;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function load(): Promise<PendingMutation[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as PendingMutation[]) : [];
}

async function save(queue: PendingMutation[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function enqueueMutation(input: Omit<PendingMutation, 'id' | 'enqueuedAt' | 'attempts'>): Promise<string> {
  const queue = await load();
  const item: PendingMutation = {
    id: uuid(),
    enqueuedAt: Date.now(),
    attempts: 0,
    ...input,
  };
  queue.push(item);
  await save(queue);
  return item.id;
}

export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const queue = await load();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const remaining: PendingMutation[] = [];
  let flushed = 0;

  for (const item of queue) {
    try {
      await apiClient.request({
        method: item.method,
        url: item.url,
        data: item.body,
        headers: { 'Idempotency-Key': item.id },
      });
      flushed += 1;
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  await save(remaining);
  return { flushed, remaining: remaining.length };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
