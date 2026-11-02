import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1024).max(65535).default(4400),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  /** 게스트에게 보낼 초대 링크의 기준 주소 (공개 게스트 페이지). 없으면 로컬 주소 */
  GUEST_PAGE_URL: z.string().url().optional(),
  DATA_DIR: z.string().default("data"),
  /** 세션별 녹음·대화록·리포트가 저장되는 폴더 */
  OUTPUT_DIR: z.string().default("output"),
});

export type Env = z.infer<typeof EnvSchema>;

const blankToUndefined = (env: NodeJS.ProcessEnv): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(env).map(([k, v]) => [k, v?.trim() ? v.trim() : undefined]));

export const env: Env = EnvSchema.parse(blankToUndefined(process.env));

export interface LivekitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function livekitConfig(): LivekitConfig | null {
  const { LIVEKIT_URL: url, LIVEKIT_API_KEY: apiKey, LIVEKIT_API_SECRET: apiSecret } = env;
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}
