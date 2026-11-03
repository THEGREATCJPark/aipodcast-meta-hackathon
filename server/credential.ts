import { parse } from 'dotenv';

/** Explicit local Gemini configuration wins over a stale inherited credential.
 * No caller may log or persist the returned key.
 */
export function selectMediaCredential(variable: string, localText: string | undefined, inherited: string | undefined): { key: string | undefined; source: 'local_env' | 'process_env' } {
  const local = localText === undefined ? {} : parse(localText);
  if (Object.hasOwn(local, variable)) return { key: local[variable].trim() || undefined, source: 'local_env' };
  return { key: inherited?.trim() || undefined, source: 'process_env' };
}
