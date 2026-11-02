import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SettingsSchema, defaultSettings, migrateSettings, type Settings } from "../../shared/settings.js";

/** MC 설정을 data/settings.json에 저장한다. 프리셋은 data/presets/*.json */
export class SettingsStore {
  private current: Settings;

  constructor(private readonly dataDir: string) {
    this.current = this.load();
  }

  get(): Settings {
    return this.current;
  }

  /** 검증 후 저장. 잘못된 값이면 zod 오류를 던진다. */
  save(input: unknown): Settings {
    const next = SettingsSchema.parse(input);
    this.writeJson(this.file(), next);
    this.current = next;
    return next;
  }

  reset(): Settings {
    return this.save(defaultSettings());
  }

  private file(): string {
    return join(this.dataDir, "settings.json");
  }

  private load(): Settings {
    const path = this.file();
    if (!existsSync(path)) return defaultSettings();
    try {
      return SettingsSchema.parse(migrateSettings(JSON.parse(readFileSync(path, "utf8"))));
    } catch {
      // 손상된 파일은 보존하고 기본값으로 시작한다.
      renameSync(path, `${path}.broken-${Date.now()}`);
      return defaultSettings();
    }
  }

  private writeJson(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
    renameSync(tmp, path);
  }
}
