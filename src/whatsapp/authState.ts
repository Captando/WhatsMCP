import {
  initAuthCreds,
  BufferJSON,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import type Database from 'better-sqlite3';

export async function useSQLiteAuthState(db: Database.Database): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  function readData(key: string): unknown {
    const row = db.prepare('SELECT value FROM wa_auth WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row ? JSON.parse(row.value, BufferJSON.reviver) : null;
  }

  function writeData(key: string, value: unknown): void {
    const serialized = JSON.stringify(value, BufferJSON.replacer);
    db.prepare(
      'INSERT INTO wa_auth (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(key, serialized);
  }

  function removeData(key: string): void {
    db.prepare('DELETE FROM wa_auth WHERE key = ?').run(key);
  }

  const creds = (readData('creds') as AuthenticationState['creds']) ?? initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]) {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          const value = readData(`keys.${type}.${id}`);
          if (value) data[id] = value as SignalDataTypeMap[T];
        }
        return data;
      },
      set(data) {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries as Record<string, unknown>)) {
            if (value) {
              writeData(`keys.${type}.${id}`, value);
            } else {
              removeData(`keys.${type}.${id}`);
            }
          }
        }
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    writeData('creds', state.creds);
  };

  return { state, saveCreds };
}
