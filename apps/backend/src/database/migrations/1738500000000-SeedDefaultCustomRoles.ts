import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultCustomRoles1738500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se os perfis já existem para evitar duplicatas
    const existingRoles = await queryRunner.query(
      `SELECT name FROM custom_roles WHERE name IN ('Gerente', 'Agente', 'Cliente')`,
    );
    const existingNames = existingRoles.map((r: { name: string }) => r.name);

    // Inserir perfil Gerente se não existir
    if (!existingNames.includes('Gerente')) {
      await queryRunner.query(`
        INSERT INTO custom_roles (id, name, description, permissions, color, is_active, created_at, updated_at)
        VALUES (
          uuid_generate_v4(),
          'Gerente',
          'Perfil de gerente com acesso gerencial e operacional',
          ARRAY[
            'tickets:create', 'tickets:read', 'tickets:read:all', 'tickets:update', 'tickets:delete',
            'tickets:assign', 'tickets:transfer', 'tickets:close', 'tickets:reopen',
            'users:read', 'users:update',
            'roles:read',
            'queues:read', 'queues:create', 'queues:update', 'queues:manage-members',
            'clients:create', 'clients:read', 'clients:update',
            'resources:create', 'resources:read', 'resources:update',
            'licenses:create', 'licenses:read', 'licenses:update',
            'settings:read',
            'reports:view', 'reports:export',
            'service-desks:read',
            'sla:read', 'sla:update',
            'timesheets:create', 'timesheets:read', 'timesheets:read:all', 'timesheets:update', 'timesheets:approve',
            'notifications:read', 'notifications:manage',
            'service-catalog:read', 'service-catalog:create', 'service-catalog:update',
            'downloads:read'
          ],
          '#10B981',
          true,
          NOW(),
          NOW()
        )
      `);
    }

    // Inserir perfil Agente se não existir
    if (!existingNames.includes('Agente')) {
      await queryRunner.query(`
        INSERT INTO custom_roles (id, name, description, permissions, color, is_active, created_at, updated_at)
        VALUES (
          uuid_generate_v4(),
          'Agente',
          'Perfil de agente/tecnico operacional',
          ARRAY[
            'tickets:create', 'tickets:read', 'tickets:read:assigned', 'tickets:update', 'tickets:close',
            'users:read',
            'queues:read',
            'clients:read',
            'resources:read',
            'licenses:read',
            'service-desks:read',
            'timesheets:create', 'timesheets:read', 'timesheets:update',
            'notifications:read',
            'service-catalog:read',
            'downloads:read'
          ],
          '#3B82F6',
          true,
          NOW(),
          NOW()
        )
      `);
    }

    // Inserir perfil Cliente se não existir
    if (!existingNames.includes('Cliente')) {
      await queryRunner.query(`
        INSERT INTO custom_roles (id, name, description, permissions, color, is_active, created_at, updated_at)
        VALUES (
          uuid_generate_v4(),
          'Cliente',
          'Perfil de cliente com acesso limitado aos proprios recursos',
          ARRAY[
            'tickets:create', 'tickets:read:own', 'tickets:update',
            'resources:read',
            'notifications:read'
          ],
          '#8B5CF6',
          true,
          NOW(),
          NOW()
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover os perfis padrão (apenas se foram criados por esta migration)
    await queryRunner.query(`
      DELETE FROM custom_roles
      WHERE name IN ('Gerente', 'Agente', 'Cliente')
      AND created_by_id IS NULL
    `);
  }
}
