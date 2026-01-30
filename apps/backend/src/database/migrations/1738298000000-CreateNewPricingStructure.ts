import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableUnique } from 'typeorm';

export class CreateNewPricingStructure1738298000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela pricing_modality_configs
    await queryRunner.createTable(
      new Table({
        name: 'pricing_modality_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'pricing_config_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'modality',
            type: 'enum',
            enum: ['internal', 'remote', 'external'],
            isNullable: false,
          },
          {
            name: 'hourly_rate',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'minimum_charge',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'minimum_charge_threshold_minutes',
            type: 'int',
            default: 60,
          },
          {
            name: 'charge_excess_per_minute',
            type: 'boolean',
            default: false,
          },
          {
            name: 'round_to_minutes',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Adicionar constraint UNIQUE (pricing_config_id, modality)
    await queryRunner.createUniqueConstraint(
      'pricing_modality_configs',
      new TableUnique({
        name: 'UQ_pricing_modality_configs_pricing_config_modality',
        columnNames: ['pricing_config_id', 'modality'],
      }),
    );

    // 3. Adicionar FK para pricing_configs
    await queryRunner.createForeignKey(
      'pricing_modality_configs',
      new TableForeignKey({
        name: 'FK_pricing_modality_configs_pricing_config',
        columnNames: ['pricing_config_id'],
        referencedTableName: 'pricing_configs',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 4. Adicionar novas colunas à tabela pricing_configs
    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'name',
        type: 'varchar',
        length: '100',
        isNullable: true, // Temporariamente nullable para migration
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'active',
        type: 'boolean',
        default: true,
      }),
    );

    // 5. Migrar dados antigos para nova estrutura
    // Para cada pricing_config existente, criar 3 modality_configs (internal, remote, external)

    // Primeiro, vamos dar nome aos pricing_configs existentes baseado no service_type (se existir)
    const existingConfigs = await queryRunner.query(`
      SELECT id, service_desk_id, service_type, pricing_type,
             hourly_rate_normal, hourly_rate_extra,
             minimum_charge, minimum_charge_threshold_minutes,
             charge_by_complete_hour
      FROM pricing_configs
    `);

    for (const config of existingConfigs) {
      // Definir nome baseado no service_type antigo
      let name = 'Configuração padrão';
      if (config.service_type === 'internal') {
        name = 'Demanda interna';
      } else if (config.service_type === 'remote') {
        name = 'Atendimento remoto';
      } else if (config.service_type === 'external') {
        name = 'Atendimento presencial';
      } else if (config.service_type === 'outsourced_n1') {
        name = 'Terceirizado N1';
      } else if (config.service_type === 'outsourced_n2') {
        name = 'Terceirizado N2';
      }

      // Atualizar nome do pricing_config
      await queryRunner.query(
        `UPDATE pricing_configs SET name = $1, description = $2, active = true WHERE id = $3`,
        [name, 'Migrado automaticamente da estrutura antiga', config.id],
      );

      // Criar 3 modality_configs (internal, remote, external)
      const modalities = ['internal', 'remote', 'external'];
      const hourlyRate = config.hourly_rate_normal || 0;
      const minimumCharge = config.minimum_charge || 0;
      const threshold = config.minimum_charge_threshold_minutes || 60;
      const chargeExcessPerMinute = config.charge_by_complete_hour === false; // Inverter lógica

      for (const modality of modalities) {
        await queryRunner.query(
          `INSERT INTO pricing_modality_configs
           (pricing_config_id, modality, hourly_rate, minimum_charge,
            minimum_charge_threshold_minutes, charge_excess_per_minute)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [config.id, modality, hourlyRate, minimumCharge, threshold, chargeExcessPerMinute],
        );
      }
    }

    // 6. Tornar coluna 'name' NOT NULL após migration
    await queryRunner.changeColumn(
      'pricing_configs',
      'name',
      new TableColumn({
        name: 'name',
        type: 'varchar',
        length: '100',
        isNullable: false,
      }),
    );

    // 7. Remover colunas antigas de pricing_configs
    const columnsToRemove = [
      'service_type',
      'pricing_type',
      'hourly_rate_normal',
      'hourly_rate_extra',
      'hourly_rate_weekend',
      'hourly_rate_holiday',
      'hourly_rate_night',
      'fixed_price',
      'contract_percentage',
      'charge_by_complete_hour',
    ];

    for (const columnName of columnsToRemove) {
      // Verificar se a coluna existe antes de tentar remover
      const hasColumn = await queryRunner.hasColumn('pricing_configs', columnName);
      if (hasColumn) {
        await queryRunner.dropColumn('pricing_configs', columnName);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: restaurar estrutura antiga

    // 1. Recriar colunas antigas
    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'service_type',
        type: 'enum',
        enum: ['internal', 'remote', 'external', 'outsourced_n1', 'outsourced_n2'],
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'pricing_type',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'hourly_rate_normal',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'minimum_charge',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'minimum_charge_threshold_minutes',
        type: 'int',
        default: 60,
      }),
    );

    await queryRunner.addColumn(
      'pricing_configs',
      new TableColumn({
        name: 'charge_by_complete_hour',
        type: 'boolean',
        default: false,
      }),
    );

    // 2. Remover colunas novas
    await queryRunner.dropColumn('pricing_configs', 'active');
    await queryRunner.dropColumn('pricing_configs', 'description');
    await queryRunner.dropColumn('pricing_configs', 'name');

    // 3. Dropar tabela pricing_modality_configs (CASCADE vai remover FK automaticamente)
    await queryRunner.dropTable('pricing_modality_configs');
  }
}
