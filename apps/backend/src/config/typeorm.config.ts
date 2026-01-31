import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'sys_ticket',
  password: process.env.DB_PASSWORD || 'sys_ticket_dev_password',
  database: process.env.DB_DATABASE || 'sys_ticket_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    timezone: 'America/Sao_Paulo',
  },
};

// DataSource para migrations CLI
const dataSource = new DataSource(typeOrmConfig);

export default dataSource;
