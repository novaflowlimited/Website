export const databaseConfig = {
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://novaflow:novaflow@localhost:5435/novaflow',
};

export type DatabaseConfig = typeof databaseConfig;
