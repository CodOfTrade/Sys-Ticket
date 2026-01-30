import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCompanyInfoToServiceDesk1738350000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campos de informações da empresa à tabela service_desks
    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_trade_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Nome Fantasia da empresa',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_cnpj',
        type: 'varchar',
        length: '18',
        isNullable: true,
        comment: 'CNPJ da empresa (formato XX.XXX.XXX/XXXX-XX)',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_legal_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Razão Social da empresa',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_address',
        type: 'text',
        isNullable: true,
        comment: 'Endereço completo da empresa',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
        comment: 'Telefone da empresa',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_email',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Email institucional da empresa',
      }),
    );

    await queryRunner.addColumn(
      'service_desks',
      new TableColumn({
        name: 'company_website',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Website da empresa',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover colunas na ordem inversa
    await queryRunner.dropColumn('service_desks', 'company_website');
    await queryRunner.dropColumn('service_desks', 'company_email');
    await queryRunner.dropColumn('service_desks', 'company_phone');
    await queryRunner.dropColumn('service_desks', 'company_address');
    await queryRunner.dropColumn('service_desks', 'company_legal_name');
    await queryRunner.dropColumn('service_desks', 'company_cnpj');
    await queryRunner.dropColumn('service_desks', 'company_trade_name');
  }
}
