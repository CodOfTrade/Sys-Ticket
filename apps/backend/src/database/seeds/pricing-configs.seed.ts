import { DataSource } from 'typeorm';

/**
 * Seed de Classificações de Atendimento (Pricing Configs)
 *
 * Cria 5 classificações pré-definidas, cada uma com 3 configurações de modalidade
 * (Interno, Remoto, Presencial externo)
 */
export async function seedPricingConfigs(dataSource: DataSource) {
  console.log('🌱 Iniciando seed de classificações de atendimento...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Buscar a mesa de serviço padrão
    const serviceDesks = await queryRunner.query(
      `SELECT id FROM service_desks WHERE is_active = true ORDER BY created_at ASC LIMIT 1`,
    );

    if (serviceDesks.length === 0) {
      console.log('⚠️  Nenhuma mesa de serviço encontrada. Execute o seed inicial primeiro.');
      await queryRunner.rollbackTransaction();
      return;
    }

    const serviceDeskId = serviceDesks[0].id;
    console.log(`📋 Usando mesa de serviço: ${serviceDeskId}`);

    // Definir as 5 classificações com suas respectivas configurações de modalidade
    const classifications = [
      {
        name: 'Atendimento avulso N1',
        description: 'Atendimento técnico nível 1 - Suporte básico',
        modalities: {
          internal: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
          remote: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
          external: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
        },
      },
      {
        name: 'Atendimento avulso N2',
        description: 'Atendimento técnico nível 2 - Suporte avançado',
        modalities: {
          internal: { hourly_rate: 110.00, minimum_charge: 110.00, threshold: 60, per_minute: true },
          remote: { hourly_rate: 110.00, minimum_charge: 110.00, threshold: 60, per_minute: true },
          external: { hourly_rate: 150.00, minimum_charge: 150.00, threshold: 60, per_minute: true },
        },
      },
      {
        name: 'Demanda interna',
        description: 'Atendimentos internos sem custo',
        modalities: {
          internal: { hourly_rate: 0.00, minimum_charge: 0.00, threshold: 60, per_minute: true },
          remote: { hourly_rate: 0.00, minimum_charge: 0.00, threshold: 60, per_minute: true },
          external: { hourly_rate: 0.00, minimum_charge: 0.00, threshold: 60, per_minute: true },
        },
      },
      {
        name: 'Terceirizado N1',
        description: 'Atendimento por terceirizado nível 1',
        modalities: {
          internal: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
          remote: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
          external: { hourly_rate: 70.00, minimum_charge: 70.00, threshold: 60, per_minute: true },
        },
      },
      {
        name: 'Terceirizado N2',
        description: 'Atendimento por terceirizado nível 2',
        modalities: {
          internal: { hourly_rate: 110.00, minimum_charge: 110.00, threshold: 60, per_minute: true },
          remote: { hourly_rate: 110.00, minimum_charge: 110.00, threshold: 60, per_minute: true },
          external: { hourly_rate: 150.00, minimum_charge: 150.00, threshold: 60, per_minute: true },
        },
      },
    ];

    // Criar cada classificação com suas modalidades
    for (const classification of classifications) {
      // Verificar se já existe
      const exists = await queryRunner.query(
        `SELECT id FROM pricing_configs WHERE service_desk_id = $1 AND name = $2`,
        [serviceDeskId, classification.name],
      );

      let pricingConfigId: string;

      if (exists.length === 0) {
        // Criar pricing_config
        const [pricingConfig] = await queryRunner.query(
          `INSERT INTO pricing_configs (service_desk_id, name, description, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [serviceDeskId, classification.name, classification.description, true],
        );
        pricingConfigId = pricingConfig.id;
        console.log(`✅ Classificação criada: ${classification.name}`);

        // Criar 3 pricing_modality_configs (internal, remote, external)
        const modalities = [
          {
            modality: 'internal',
            config: classification.modalities.internal,
          },
          {
            modality: 'remote',
            config: classification.modalities.remote,
          },
          {
            modality: 'external',
            config: classification.modalities.external,
          },
        ];

        for (const modalityData of modalities) {
          await queryRunner.query(
            `INSERT INTO pricing_modality_configs (
              pricing_config_id, modality, hourly_rate, minimum_charge,
              minimum_charge_threshold_minutes, charge_excess_per_minute,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              pricingConfigId,
              modalityData.modality,
              modalityData.config.hourly_rate,
              modalityData.config.minimum_charge,
              modalityData.config.threshold,
              modalityData.config.per_minute,
            ],
          );
        }

        console.log(`   ├─ Modalidade INTERNO: R$ ${classification.modalities.internal.hourly_rate.toFixed(2)}/h`);
        console.log(`   ├─ Modalidade REMOTO: R$ ${classification.modalities.remote.hourly_rate.toFixed(2)}/h`);
        console.log(`   └─ Modalidade EXTERNO: R$ ${classification.modalities.external.hourly_rate.toFixed(2)}/h`);
      } else {
        console.log(`ℹ️  Classificação já existe: ${classification.name}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log('\n✅ Seed de classificações concluído com sucesso!');
    console.log('==========================================');
    console.log('📊 CLASSIFICAÇÕES CRIADAS:');
    console.log('==========================================');
    console.log('1. Atendimento avulso N1');
    console.log('2. Atendimento avulso N2');
    console.log('3. Demanda interna');
    console.log('4. Terceirizado N1');
    console.log('5. Terceirizado N2');
    console.log('==========================================');
    console.log('Cada classificação possui 3 modalidades:');
    console.log('- Interno');
    console.log('- Remoto');
    console.log('- Presencial externo');
    console.log('==========================================\n');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Erro ao executar seed de pricing configs:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  const { DataSource } = require('typeorm');
  const { typeOrmConfig } = require('../../config/typeorm.config');

  const dataSource = new DataSource(typeOrmConfig);

  dataSource
    .initialize()
    .then(async () => {
      await seedPricingConfigs(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao conectar ao banco:', error);
      process.exit(1);
    });
}
