import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

export async function seedInitialSetup(dataSource: DataSource) {
  console.log('🌱 Iniciando seed de configuração inicial...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Criar usuário admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const adminExists = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['admin@systicket.com'],
    );

    let adminId: string;

    if (adminExists.length === 0) {
      const [admin] = await queryRunner.query(
        `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        ['Administrador', 'admin@systicket.com', hashedPassword, 'admin', 'active'],
      );
      adminId = admin.id;
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@systicket.com');
      console.log('🔑 Senha: admin123');
    } else {
      adminId = adminExists[0].id;
      console.log('ℹ️  Usuário admin já existe');
    }

    // 2. Criar mesa de serviço padrão
    const serviceDeskExists = await queryRunner.query(
      `SELECT id FROM service_desks WHERE name = $1`,
      ['Suporte Técnico'],
    );

    let serviceDeskId: string;

    if (serviceDeskExists.length === 0) {
      const [serviceDesk] = await queryRunner.query(
        `INSERT INTO service_desks (name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [
          'Suporte Técnico',
          'Mesa de serviço padrão para atendimentos técnicos',
          true,
        ],
      );
      serviceDeskId = serviceDesk.id;
      console.log('✅ Mesa de serviço padrão criada!');
    } else {
      serviceDeskId = serviceDeskExists[0].id;
      console.log('ℹ️  Mesa de serviço já existe');
    }

    // 3. Associar usuário admin à mesa de serviço
    await queryRunner.query(
      `UPDATE users SET service_desk_ids = $1 WHERE id = $2`,
      [`{${serviceDeskId}}`, adminId],
    );
    console.log('✅ Usuário admin associado à mesa de serviço');

    // 4. Criar tabela pricing_configs se não existir
    // NOTA: Tabela pricing_configs agora é criada/modificada via migrations
    // Os dados são inseridos via pricing-configs.seed.ts com a nova estrutura
    console.log('ℹ️  Tabela pricing_configs será criada/atualizada via migrations');
    console.log('ℹ️  Dados de pricing_configs serão inseridos via pricing-configs.seed.ts');

    await queryRunner.commitTransaction();
    console.log('✅ Seed concluído com sucesso!\n');
    console.log('==========================================');
    console.log('📋 DADOS DE ACESSO:');
    console.log('==========================================');
    console.log('Email: admin@systicket.com');
    console.log('Senha: admin123');
    console.log('Role: admin');
    console.log('==========================================\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Erro ao executar seed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  const { DataSource } = require('typeorm');
  const config = require('../../ormconfig');

  const dataSource = new DataSource(config);

  dataSource
    .initialize()
    .then(async () => {
      await seedInitialSetup(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao conectar ao banco:', error);
      process.exit(1);
    });
}
