import { DataSource } from 'typeorm';

export async function seedQueues(dataSource: DataSource) {
  console.log('🌱 Iniciando seed de filas...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Buscar a mesa de serviço padrão
    const serviceDesks = await queryRunner.query(
      `SELECT id FROM service_desks WHERE name = $1 LIMIT 1`,
      ['Suporte Técnico'],
    );

    if (serviceDesks.length === 0) {
      console.log('⚠️  Mesa de serviço padrão não encontrada. Execute o seed inicial primeiro.');
      await queryRunner.rollbackTransaction();
      return;
    }

    const serviceDeskId = serviceDesks[0].id;
    console.log(`📋 Mesa de serviço encontrada: ${serviceDeskId}`);

    // 2. Definir filas padrão
    const defaultQueues = [
      {
        name: 'Suporte N1',
        description: 'Atendimento de primeiro nível - Suporte básico e triagem',
        distribution_strategy: 'round_robin',
        color: '#3B82F6', // Blue
        display_order: 1,
        auto_assignment_config: {
          enabled: true,
          on_ticket_create: true,
          on_ticket_status_change: false,
          max_tickets_per_member: 10,
          priority_weight: false,
          skills_matching: false,
        },
      },
      {
        name: 'Suporte N2',
        description: 'Atendimento de segundo nível - Problemas complexos e técnicos',
        distribution_strategy: 'load_balance',
        color: '#8B5CF6', // Purple
        display_order: 2,
        auto_assignment_config: {
          enabled: true,
          on_ticket_create: false,
          on_ticket_status_change: true,
          max_tickets_per_member: 5,
          priority_weight: true,
          skills_matching: false,
        },
      },
      {
        name: 'Atendimento Externo',
        description: 'Fila para atendimentos presenciais e externos',
        distribution_strategy: 'manual',
        color: '#10B981', // Green
        display_order: 3,
        auto_assignment_config: {
          enabled: false,
          on_ticket_create: false,
          on_ticket_status_change: false,
          max_tickets_per_member: null,
          priority_weight: false,
          skills_matching: false,
        },
      },
      {
        name: 'Urgências',
        description: 'Fila para tickets urgentes e de alta prioridade',
        distribution_strategy: 'load_balance',
        color: '#EF4444', // Red
        display_order: 0, // Primeira na lista
        auto_assignment_config: {
          enabled: true,
          on_ticket_create: true,
          on_ticket_status_change: false,
          max_tickets_per_member: 3,
          priority_weight: true,
          skills_matching: false,
        },
        sla_config: {
          priorities: {
            low: { first_response: 60, resolution: 480 }, // 1h, 8h
            medium: { first_response: 30, resolution: 240 }, // 30min, 4h
            high: { first_response: 15, resolution: 120 }, // 15min, 2h
            urgent: { first_response: 10, resolution: 60 }, // 10min, 1h
          },
        },
      },
    ];

    // 3. Criar filas
    let createdCount = 0;
    let skippedCount = 0;

    for (const queueData of defaultQueues) {
      // Verificar se a fila já existe
      const exists = await queryRunner.query(
        `SELECT id FROM queues WHERE service_desk_id = $1 AND name = $2`,
        [serviceDeskId, queueData.name],
      );

      if (exists.length > 0) {
        console.log(`ℹ️  Fila "${queueData.name}" já existe`);
        skippedCount++;
        continue;
      }

      // Inserir fila
      await queryRunner.query(
        `INSERT INTO queues (
          service_desk_id,
          name,
          description,
          distribution_strategy,
          auto_assignment_config,
          sla_config,
          color,
          display_order,
          is_active,
          round_robin_index,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          serviceDeskId,
          queueData.name,
          queueData.description,
          queueData.distribution_strategy,
          JSON.stringify(queueData.auto_assignment_config),
          queueData.sla_config ? JSON.stringify(queueData.sla_config) : null,
          queueData.color,
          queueData.display_order,
          true,
          0,
        ],
      );

      console.log(`✅ Fila "${queueData.name}" criada com sucesso!`);
      createdCount++;
    }

    await queryRunner.commitTransaction();
    console.log('\n==========================================');
    console.log('📊 RESUMO DO SEED DE FILAS:');
    console.log('==========================================');
    console.log(`✅ Filas criadas: ${createdCount}`);
    console.log(`ℹ️  Filas já existentes: ${skippedCount}`);
    console.log('==========================================\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Erro ao executar seed de filas:', error);
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
      await seedQueues(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao conectar ao banco:', error);
      process.exit(1);
    });
}
