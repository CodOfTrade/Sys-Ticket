import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlaConfigToQueues1738400000000 implements MigrationInterface {
  name = 'AddSlaConfigToQueues1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona coluna sla_config na tabela queues
    await queryRunner.query(`
      ALTER TABLE "queues"
      ADD COLUMN IF NOT EXISTS "sla_config" JSONB DEFAULT NULL
    `);

    // Comentário para documentação
    await queryRunner.query(`
      COMMENT ON COLUMN "queues"."sla_config" IS 'Configuração de SLA específica da fila. Se null, usa o SLA padrão do service_desk.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "queues" DROP COLUMN IF EXISTS "sla_config"
    `);
  }
}
