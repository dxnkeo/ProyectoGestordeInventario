import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_TIMEZONE: z.string().default("America/Santiago"),
  EXTERNAL_API_KEY: z.string().optional(),
});

/**
 * Valida las variables de entorno al arranque del servidor.
 * Lanza un error descriptivo si falta alguna variable crítica.
 * Solo debe llamarse desde server.ts — no en tiempo de importación.
 */
export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue: z.ZodIssue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Variables de entorno inválidas:\n${missing}\n\nRevisa tu archivo .env`
    );
  }
}
