import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBusinessHoursStructure1738360000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Converter estrutura de business_hours de formato simples para formato flexível com múltiplos períodos

    // Query para atualizar service_desks que têm sla_config com business_hours no formato antigo
    await queryRunner.query(`
      UPDATE service_desks
      SET sla_config = jsonb_set(
        sla_config,
        '{business_hours}',
        jsonb_build_object(
          'timezone', sla_config->'business_hours'->>'timezone',
          'schedules', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'day_of_week', day::int,
                'periods', jsonb_build_array(
                  jsonb_build_object(
                    'start', sla_config->'business_hours'->>'start',
                    'end', sla_config->'business_hours'->>'end'
                  )
                )
              )
            )
            FROM unnest(
              ARRAY(
                SELECT jsonb_array_elements_text(sla_config->'working_days')::int
              )
            ) AS day
          )
        )
      )
      WHERE sla_config IS NOT NULL
        AND sla_config->'business_hours' IS NOT NULL
        AND sla_config->'business_hours'->'start' IS NOT NULL
        AND sla_config->'business_hours'->>'schedules' IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter para estrutura antiga (pegar apenas o primeiro período do primeiro dia)
    await queryRunner.query(`
      UPDATE service_desks
      SET sla_config = jsonb_set(
        sla_config,
        '{business_hours}',
        jsonb_build_object(
          'timezone', sla_config->'business_hours'->>'timezone',
          'start', sla_config->'business_hours'->'schedules'->0->'periods'->0->>'start',
          'end', sla_config->'business_hours'->'schedules'->0->'periods'->0->>'end'
        )
      )
      WHERE sla_config IS NOT NULL
        AND sla_config->'business_hours' IS NOT NULL
        AND sla_config->'business_hours'->'schedules' IS NOT NULL;
    `);
  }
}
