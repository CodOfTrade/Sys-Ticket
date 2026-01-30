import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class UpdateTicketAppointmentsStructure1738298100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Adicionar coluna pricing_config_id
    await queryRunner.addColumn(
      'ticket_appointments',
      new TableColumn({
        name: 'pricing_config_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 2. Renomear service_type para service_modality (se existir)
    const hasServiceType = await queryRunner.hasColumn('ticket_appointments', 'service_type');

    if (hasServiceType) {
      // Criar nova coluna service_modality
      await queryRunner.addColumn(
        'ticket_appointments',
        new TableColumn({
          name: 'service_modality',
          type: 'enum',
          enum: ['internal', 'remote', 'external'],
          isNullable: true,
        }),
      );

      // Migrar dados de service_type para service_modality
      // Mapear valores antigos para novos
      await queryRunner.query(`
        UPDATE ticket_appointments
        SET service_modality = service_type::text::ticket_appointments_service_modality_enum
      `);

      // Remover coluna antiga service_type
      await queryRunner.dropColumn('ticket_appointments', 'service_type');
    }

    // 3. Migrar dados: associar appointments a pricing_configs
    // Buscar primeiro pricing_config de cada service_desk para usar como padrão
    const appointments = await queryRunner.query(`
      SELECT ta.id, ta.service_modality, t.service_desk_id
      FROM ticket_appointments ta
      INNER JOIN tickets t ON ta.ticket_id = t.id
      WHERE ta.pricing_config_id IS NULL
    `);

    for (const appointment of appointments) {
      // Buscar um pricing_config adequado para este appointment
      // Tentar encontrar baseado no nome (heurística)
      let pricingConfig: any[] | null = null;

      // Tentar encontrar por modalidade correspondente no nome
      if (appointment.service_modality === 'internal') {
        pricingConfig = await queryRunner.query(
          `SELECT id FROM pricing_configs
           WHERE service_desk_id = $1
           AND (name ILIKE '%interno%' OR name ILIKE '%demanda interna%')
           LIMIT 1`,
          [appointment.service_desk_id],
        );
      } else if (appointment.service_modality === 'remote') {
        pricingConfig = await queryRunner.query(
          `SELECT id FROM pricing_configs
           WHERE service_desk_id = $1
           AND (name ILIKE '%remoto%' OR name ILIKE '%avulso%')
           LIMIT 1`,
          [appointment.service_desk_id],
        );
      } else if (appointment.service_modality === 'external') {
        pricingConfig = await queryRunner.query(
          `SELECT id FROM pricing_configs
           WHERE service_desk_id = $1
           AND (name ILIKE '%presencial%' OR name ILIKE '%externo%')
           LIMIT 1`,
          [appointment.service_desk_id],
        );
      }

      // Se não encontrou por nome, pegar o primeiro disponível
      if (!pricingConfig || pricingConfig.length === 0) {
        pricingConfig = await queryRunner.query(
          `SELECT id FROM pricing_configs
           WHERE service_desk_id = $1
           ORDER BY created_at ASC
           LIMIT 1`,
          [appointment.service_desk_id],
        );
      }

      if (pricingConfig && pricingConfig.length > 0) {
        await queryRunner.query(
          `UPDATE ticket_appointments SET pricing_config_id = $1 WHERE id = $2`,
          [pricingConfig[0].id, appointment.id],
        );
      }
    }

    // 4. Adicionar FK para pricing_configs
    await queryRunner.createForeignKey(
      'ticket_appointments',
      new TableForeignKey({
        name: 'FK_ticket_appointments_pricing_config',
        columnNames: ['pricing_config_id'],
        referencedTableName: 'pricing_configs',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL', // Não deletar appointments se pricing_config for deletado
      }),
    );

    // 5. Remover coluna service_level (se existir)
    const hasServiceLevel = await queryRunner.hasColumn('ticket_appointments', 'service_level');
    if (hasServiceLevel) {
      await queryRunner.dropColumn('ticket_appointments', 'service_level');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: restaurar estrutura antiga

    // 1. Recriar coluna service_level
    await queryRunner.addColumn(
      'ticket_appointments',
      new TableColumn({
        name: 'service_level',
        type: 'enum',
        enum: ['n1', 'n2'],
        isNullable: true,
      }),
    );

    // 2. Remover FK de pricing_config_id
    const foreignKey = await queryRunner.getTable('ticket_appointments');
    const pricingConfigFK = foreignKey?.foreignKeys.find(
      fk => fk.columnNames.indexOf('pricing_config_id') !== -1,
    );
    if (pricingConfigFK) {
      await queryRunner.dropForeignKey('ticket_appointments', pricingConfigFK);
    }

    // 3. Recriar coluna service_type
    await queryRunner.addColumn(
      'ticket_appointments',
      new TableColumn({
        name: 'service_type',
        type: 'enum',
        enum: ['internal', 'remote', 'external', 'outsourced_n1', 'outsourced_n2'],
        isNullable: true,
      }),
    );

    // 4. Migrar dados de volta de service_modality para service_type
    await queryRunner.query(`
      UPDATE ticket_appointments
      SET service_type = service_modality::text
      WHERE service_modality IS NOT NULL
    `);

    // 5. Remover coluna service_modality
    await queryRunner.dropColumn('ticket_appointments', 'service_modality');

    // 6. Remover coluna pricing_config_id
    await queryRunner.dropColumn('ticket_appointments', 'pricing_config_id');
  }
}
