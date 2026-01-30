import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateQueuesAndQueueMembers1738298200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela queues
    await queryRunner.createTable(
      new Table({
        name: 'queues',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'service_desk_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'distribution_strategy',
            type: 'enum',
            enum: ['manual', 'round_robin', 'load_balance', 'skill_based'],
            default: "'manual'",
            isNullable: false,
          },
          {
            name: 'auto_assignment_config',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'round_robin_index',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            default: "'#3B82F6'",
            isNullable: true,
          },
          {
            name: 'display_order',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. Criar índices na tabela queues
    await queryRunner.createIndex(
      'queues',
      new TableIndex({
        name: 'IDX_QUEUES_SERVICE_DESK_ID',
        columnNames: ['service_desk_id'],
      }),
    );

    await queryRunner.createIndex(
      'queues',
      new TableIndex({
        name: 'IDX_QUEUES_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    // 3. Criar foreign key para service_desks
    await queryRunner.createForeignKey(
      'queues',
      new TableForeignKey({
        columnNames: ['service_desk_id'],
        referencedTableName: 'service_desks',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_QUEUES_SERVICE_DESK',
      }),
    );

    // 4. Criar tabela junction queue_members
    await queryRunner.createTable(
      new Table({
        name: 'queue_members',
        columns: [
          {
            name: 'queue_id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'joined_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 5. Criar foreign keys na tabela queue_members
    await queryRunner.createForeignKey(
      'queue_members',
      new TableForeignKey({
        columnNames: ['queue_id'],
        referencedTableName: 'queues',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_QUEUE_MEMBERS_QUEUE',
      }),
    );

    await queryRunner.createForeignKey(
      'queue_members',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_QUEUE_MEMBERS_USER',
      }),
    );

    // 6. Criar índices na tabela queue_members
    await queryRunner.createIndex(
      'queue_members',
      new TableIndex({
        name: 'IDX_QUEUE_MEMBERS_QUEUE_ID',
        columnNames: ['queue_id'],
      }),
    );

    await queryRunner.createIndex(
      'queue_members',
      new TableIndex({
        name: 'IDX_QUEUE_MEMBERS_USER_ID',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign keys
    await queryRunner.dropForeignKey('queue_members', 'FK_QUEUE_MEMBERS_USER');
    await queryRunner.dropForeignKey('queue_members', 'FK_QUEUE_MEMBERS_QUEUE');
    await queryRunner.dropForeignKey('queues', 'FK_QUEUES_SERVICE_DESK');

    // Remover índices
    await queryRunner.dropIndex('queue_members', 'IDX_QUEUE_MEMBERS_USER_ID');
    await queryRunner.dropIndex('queue_members', 'IDX_QUEUE_MEMBERS_QUEUE_ID');
    await queryRunner.dropIndex('queues', 'IDX_QUEUES_IS_ACTIVE');
    await queryRunner.dropIndex('queues', 'IDX_QUEUES_SERVICE_DESK_ID');

    // Remover tabelas
    await queryRunner.dropTable('queue_members');
    await queryRunner.dropTable('queues');
  }
}
