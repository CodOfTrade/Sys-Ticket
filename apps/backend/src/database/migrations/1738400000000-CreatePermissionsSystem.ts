import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class CreatePermissionsSystem1738400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Criar tabela custom_roles
    await queryRunner.createTable(
      new Table({
        name: 'custom_roles',
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
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'text',
            isArray: true,
            default: "'{}'",
            isNullable: false,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            default: "'#6B7280'",
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. Criar foreign key created_by_id -> users
    await queryRunner.createForeignKey(
      'custom_roles',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_CUSTOM_ROLES_CREATED_BY',
      }),
    );

    // 3. Criar indices na tabela custom_roles
    await queryRunner.createIndex(
      'custom_roles',
      new TableIndex({
        name: 'IDX_CUSTOM_ROLES_IS_ACTIVE',
        columnNames: ['is_active'],
      }),
    );

    // 4. Criar tabela permission_audit_logs
    await queryRunner.createTable(
      new Table({
        name: 'permission_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'target_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'changed_by_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'old_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 5. Criar foreign keys na tabela permission_audit_logs
    await queryRunner.createForeignKey(
      'permission_audit_logs',
      new TableForeignKey({
        columnNames: ['target_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_PERMISSION_AUDIT_TARGET_USER',
      }),
    );

    await queryRunner.createForeignKey(
      'permission_audit_logs',
      new TableForeignKey({
        columnNames: ['changed_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_PERMISSION_AUDIT_CHANGED_BY',
      }),
    );

    // 6. Criar indices na tabela permission_audit_logs
    await queryRunner.createIndex(
      'permission_audit_logs',
      new TableIndex({
        name: 'IDX_PERMISSION_AUDIT_TARGET_USER',
        columnNames: ['target_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'permission_audit_logs',
      new TableIndex({
        name: 'IDX_PERMISSION_AUDIT_CHANGED_BY',
        columnNames: ['changed_by_id'],
      }),
    );

    await queryRunner.createIndex(
      'permission_audit_logs',
      new TableIndex({
        name: 'IDX_PERMISSION_AUDIT_CREATED_AT',
        columnNames: ['created_at'],
      }),
    );

    // 7. Adicionar coluna custom_role_id na tabela users
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'custom_role_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // 8. Criar foreign key custom_role_id -> custom_roles
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['custom_role_id'],
        referencedTableName: 'custom_roles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_USERS_CUSTOM_ROLE',
      }),
    );

    // 9. Criar indice na coluna custom_role_id
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_USERS_CUSTOM_ROLE_ID',
        columnNames: ['custom_role_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover indice e foreign key de users.custom_role_id
    await queryRunner.dropIndex('users', 'IDX_USERS_CUSTOM_ROLE_ID');
    await queryRunner.dropForeignKey('users', 'FK_USERS_CUSTOM_ROLE');
    await queryRunner.dropColumn('users', 'custom_role_id');

    // Remover indices de permission_audit_logs
    await queryRunner.dropIndex('permission_audit_logs', 'IDX_PERMISSION_AUDIT_CREATED_AT');
    await queryRunner.dropIndex('permission_audit_logs', 'IDX_PERMISSION_AUDIT_CHANGED_BY');
    await queryRunner.dropIndex('permission_audit_logs', 'IDX_PERMISSION_AUDIT_TARGET_USER');

    // Remover foreign keys de permission_audit_logs
    await queryRunner.dropForeignKey('permission_audit_logs', 'FK_PERMISSION_AUDIT_CHANGED_BY');
    await queryRunner.dropForeignKey('permission_audit_logs', 'FK_PERMISSION_AUDIT_TARGET_USER');

    // Remover tabela permission_audit_logs
    await queryRunner.dropTable('permission_audit_logs');

    // Remover indice de custom_roles
    await queryRunner.dropIndex('custom_roles', 'IDX_CUSTOM_ROLES_IS_ACTIVE');

    // Remover foreign key de custom_roles
    await queryRunner.dropForeignKey('custom_roles', 'FK_CUSTOM_ROLES_CREATED_BY');

    // Remover tabela custom_roles
    await queryRunner.dropTable('custom_roles');
  }
}
