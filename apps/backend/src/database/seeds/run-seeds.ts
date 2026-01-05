import { DataSource } from 'typeorm';
import { seedInitialSetup } from './initial-setup.seed';

// Configuração do TypeORM
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'sys_ticket',
  password: process.env.DB_PASSWORD || '123321',
  database: process.env.DB_DATABASE || 'sys_ticket_db',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
});

async function runSeeds() {
  console.log('🚀 Conectando ao banco de dados...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ Conectado ao banco de dados!\n');

    // Executar seed de setup inicial
    await seedInitialSetup(AppDataSource);

    console.log('\n✅ Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro ao executar seeds:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('\n👋 Conexão encerrada.');
    process.exit(0);
  }
}

runSeeds();
