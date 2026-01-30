import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey } from 'typeorm';

export class AddQueueIdToTickets1738298300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Adicionar coluna queue_id na tabela tickets
    await queryRunner.addColumn(
      'tickets',
      new TableColumn({
        name: 'queue_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 2. Criar índice para queue_id
    await queryRunner.createIndex(
      'tickets',
      new TableIndex({
        name: 'IDX_TICKETS_QUEUE_ID',
        columnNames: ['queue_id'],
      }),
    );

    // 3. Criar foreign key para queues
    await queryRunner.createForeignKey(
      'tickets',
      new TableForeignKey({
        columnNames: ['queue_id'],
        referencedTableName: 'queues',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL', // Se a fila for deletada, queue_id vira null (não deleta o ticket)
        name: 'FK_TICKETS_QUEUE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign key
    await queryRunner.dropForeignKey('tickets', 'FK_TICKETS_QUEUE');

    // Remover índice
    await queryRunner.dropIndex('tickets', 'IDX_TICKETS_QUEUE_ID');

    // Remover coluna
    await queryRunner.dropColumn('tickets', 'queue_id');
  }
}
