import 'reflect-metadata'
import pg from 'pg'
import { DataSource } from 'typeorm'
import { env } from '../../config/env.js'
import { entities } from './entities/index.js'
import { SnakeNamingStrategy } from './naming-strategy.js'

pg.types.setTypeParser(20, (value: string) => Number(value))
pg.types.setTypeParser(1700, (value: string) => Number(value))
pg.types.setTypeParser(1082, (value: string) => value)

function postgresSsl() {
  if (env.pg.sslmode === 'require' || env.pg.sslmode === 'verify-full') {
    return { rejectUnauthorized: env.pg.sslmode === 'verify-full' }
  }
  return false as const
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.pg.dsn || undefined,
  host: env.pg.dsn ? undefined : env.pg.host,
  port: env.pg.dsn ? undefined : env.pg.port,
  username: env.pg.dsn ? undefined : env.pg.user,
  password: env.pg.dsn ? undefined : env.pg.password,
  database: env.pg.dsn ? undefined : env.pg.database,
  schema: env.pg.schema,
  ssl: postgresSsl(),
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  dropSchema: false,
  logging: false,
  entities,
})

export async function initDataSource() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize()
  }
}
