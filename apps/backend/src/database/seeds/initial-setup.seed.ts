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
        `INSERT INTO users (name, email, password, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        ['Administrador', 'admin@systicket.com', hashedPassword, 'admin', true],
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
        `INSERT INTO service_desks (name, description, active, created_at, updated_at)
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

    // 3. Criar configurações de preço padrão
    const pricingTypes = [
      {
        service_type: 'remote',
        hourly_rate_normal: 100.00,
        hourly_rate_extra: 150.00,
        hourly_rate_weekend: 200.00,
        hourly_rate_holiday: 250.00,
        hourly_rate_night: 150.00,
        description: 'Atendimento Remoto',
      },
      {
        service_type: 'external',
        hourly_rate_normal: 150.00,
        hourly_rate_extra: 225.00,
        hourly_rate_weekend: 300.00,
        hourly_rate_holiday: 375.00,
        hourly_rate_night: 225.00,
        description: 'Atendimento Presencial/Externo',
      },
      {
        service_type: 'internal',
        hourly_rate_normal: 50.00,
        hourly_rate_extra: 75.00,
        hourly_rate_weekend: 100.00,
        hourly_rate_holiday: 125.00,
        hourly_rate_night: 75.00,
        description: 'Atendimento Interno',
      },
    ];

    for (const pricing of pricingTypes) {
      const exists = await queryRunner.query(
        `SELECT id FROM pricing_configs WHERE service_desk_id = $1 AND service_type = $2`,
        [serviceDeskId, pricing.service_type],
      );

      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO pricing_configs (
            service_desk_id, service_type, pricing_type,
            hourly_rate_normal, hourly_rate_extra, hourly_rate_weekend,
            hourly_rate_holiday, hourly_rate_night,
            fixed_price, contract_percentage, minimum_charge, round_to_minutes,
            active, description, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            serviceDeskId,
            pricing.service_type,
            'hourly',
            pricing.hourly_rate_normal,
            pricing.hourly_rate_extra,
            pricing.hourly_rate_weekend,
            pricing.hourly_rate_holiday,
            pricing.hourly_rate_night,
            0,
            100,
            0,
            30,
            true,
            pricing.description,
          ],
        );
        console.log(`✅ Configuração de preço criada: ${pricing.description}`);
      } else {
        console.log(`ℹ️  Configuração ${pricing.description} já existe`);
      }
    }

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
