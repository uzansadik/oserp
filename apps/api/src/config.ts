/** Ortam değişkenlerinden doğrulanmış uygulama yapılandırması. */
export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtIssuer: string | undefined;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Ortam değişkenlerini okur ve doğrular; eksikse anlamlı hata fırlatır. */
export function loadConfig(): AppConfig {
  const portRaw = process.env.PORT ?? '3000';
  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${portRaw}`);
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '0.0.0.0',
    port,
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET'),
    jwtIssuer: process.env.JWT_ISSUER,
  };
}
