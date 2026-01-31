import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertTimestampToTimestamptz1738281234567 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Configurar timezone da sessão
    await queryRunner.query(`SET timezone = 'America/Sao_Paulo'`);

    console.log('Iniciando conversão de colunas timestamp para timestamptz...');
    console.log('Timezone configurado: America/Sao_Paulo\n');

    // Tickets (núcleo do sistema)
    await this.convertTableColumns(queryRunner, 'tickets', [
      'created_at',
      'updated_at',
      'closed_at',
      'started_at',
      'paused_at',
    ]);

    // Ticket Comments
    await this.convertTableColumns(queryRunner, 'ticket_comments', [
      'sent_at',
      'edited_at',
      'created_at',
      'updated_at',
    ]);

    // Ticket Appointments
    await this.convertTableColumns(queryRunner, 'ticket_appointments', [
      'timer_started_at',
      'timer_stopped_at',
      'approved_at',
      'created_at',
      'updated_at',
    ]);

    // Ticket Approvals
    await this.convertTableColumns(queryRunner, 'ticket_approvals', [
      'expires_at',
      'responded_at',
      'email_sent_at',
      'created_at',
      'updated_at',
    ]);

    // Ticket History
    await this.convertTableColumns(queryRunner, 'ticket_history', ['created_at']);

    // Ticket Attachments
    await this.convertTableColumns(queryRunner, 'ticket_attachments', ['created_at']);

    // Ticket Checklists
    await this.convertTableColumns(queryRunner, 'ticket_checklists', [
      'completed_at',
      'created_at',
      'updated_at',
    ]);

    // Ticket Followers
    await this.convertTableColumns(queryRunner, 'ticket_followers', ['created_at']);

    // Ticket Valuations
    await this.convertTableColumns(queryRunner, 'ticket_valuations', [
      'approved_at',
      'synced_at',
      'created_at',
      'updated_at',
    ]);

    // Checklists (templates)
    await this.convertTableColumns(queryRunner, 'checklists', [
      'created_at',
      'updated_at',
    ]);

    // Timesheets
    await this.convertTableColumns(queryRunner, 'timesheets', [
      'start_time',
      'end_time',
      'synced_at',
      'approved_at',
      'created_at',
      'updated_at',
    ]);

    // Users
    await this.convertTableColumns(queryRunner, 'users', [
      'last_login_at',
      'created_at',
      'updated_at',
    ]);

    // Resources
    await this.convertTableColumns(queryRunner, 'resources', [
      'last_seen_at',
      'pending_command_at',
      'agent_installed_at',
      'agent_last_heartbeat',
      'os_last_updated',
      'antivirus_last_updated',
      'retired_at',
      'created_at',
      'updated_at',
    ]);

    // Resource History
    await this.convertTableColumns(queryRunner, 'resource_history', ['created_at']);

    // Resource Licenses
    await this.convertTableColumns(queryRunner, 'resource_licenses', [
      'activated_at',
      'deactivated_at',
      'created_at',
      'updated_at',
    ]);

    // Agent Activation Codes
    await this.convertTableColumns(queryRunner, 'agent_activation_codes', [
      'expires_at',
      'created_at',
      'updated_at',
    ]);

    // Agent Chat Messages
    await this.convertTableColumns(queryRunner, 'agent_chat_messages', [
      'read_at',
      'created_at',
    ]);

    // Agent Tickets
    await this.convertTableColumns(queryRunner, 'agent_tickets', ['created_at']);

    // Contract Resource Quotas
    await this.convertTableColumns(queryRunner, 'contract_resource_quotas', [
      'created_at',
      'updated_at',
    ]);

    // License Device Assignments
    await this.convertTableColumns(queryRunner, 'license_device_assignments', [
      'created_at',
    ]);

    // License History
    await this.convertTableColumns(queryRunner, 'license_history', ['created_at']);

    // Client Contacts
    await this.convertTableColumns(queryRunner, 'client_contacts', [
      'created_at',
      'updated_at',
    ]);

    // SIGE Clients
    await this.convertTableColumns(queryRunner, 'sige_clients', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    // SIGE Contracts
    await this.convertTableColumns(queryRunner, 'sige_contracts', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    // SIGE Products
    await this.convertTableColumns(queryRunner, 'sige_products', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    // Service Catalogs
    await this.convertTableColumns(queryRunner, 'service_catalogs', [
      'created_at',
      'updated_at',
    ]);

    // Service Categories
    await this.convertTableColumns(queryRunner, 'service_categories', [
      'created_at',
      'updated_at',
    ]);

    // Service Desks
    await this.convertTableColumns(queryRunner, 'service_desks', [
      'created_at',
      'updated_at',
    ]);

    // Pricing Configs
    await this.convertTableColumns(queryRunner, 'pricing_configs', [
      'created_at',
      'updated_at',
    ]);

    // Pricing Modality Configs
    await this.convertTableColumns(queryRunner, 'pricing_modality_configs', [
      'created_at',
      'updated_at',
    ]);

    // Queues
    await this.convertTableColumns(queryRunner, 'queues', ['created_at', 'updated_at']);

    // Notifications
    await this.convertTableColumns(queryRunner, 'notifications', [
      'read_at',
      'created_at',
    ]);

    // Notification Configs
    await this.convertTableColumns(queryRunner, 'notification_configs', [
      'created_at',
      'updated_at',
    ]);

    // Notification Email Templates
    await this.convertTableColumns(queryRunner, 'notification_email_templates', [
      'created_at',
      'updated_at',
    ]);

    // System Settings
    await this.convertTableColumns(queryRunner, 'system_settings', [
      'created_at',
      'updated_at',
    ]);

    console.log('\n✓ Conversão concluída com sucesso!');
  }

  private async convertTableColumns(
    queryRunner: QueryRunner,
    tableName: string,
    columns: string[],
  ): Promise<void> {
    for (const column of columns) {
      try {
        // Verifica se coluna existe e é timestamp without time zone
        const columnInfo = await queryRunner.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = '${tableName}' AND column_name = '${column}'
        `);

        if (columnInfo.length > 0) {
          const dataType = columnInfo[0].data_type;

          // Só converte se for timestamp without time zone
          if (dataType === 'timestamp without time zone') {
            await queryRunner.query(`
              ALTER TABLE "${tableName}"
              ALTER COLUMN "${column}" TYPE timestamptz
              USING "${column}" AT TIME ZONE 'America/Sao_Paulo'
            `);

            console.log(`  ✓ ${tableName}.${column} -> timestamptz`);
          } else if (dataType === 'timestamp with time zone') {
            console.log(`  ○ ${tableName}.${column} (já é timestamptz)`);
          } else {
            console.log(`  ⊗ ${tableName}.${column} (tipo: ${dataType}, pulado)`);
          }
        } else {
          console.log(`  ⚠ ${tableName}.${column} (coluna não existe)`);
        }
      } catch (error) {
        console.error(`  ✗ Erro ao converter ${tableName}.${column}:`, error.message);
        // Continua mesmo se houver erro em uma coluna específica
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Configurar timezone da sessão
    await queryRunner.query(`SET timezone = 'America/Sao_Paulo'`);

    console.log('Revertendo conversão de timestamptz para timestamp...');
    console.log('AVISO: Esta operação removerá informações de timezone!\n');

    // Reverter na ordem inversa
    await this.revertTableColumns(queryRunner, 'system_settings', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'notification_email_templates', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'notification_configs', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'notifications', [
      'read_at',
      'created_at',
    ]);

    await this.revertTableColumns(queryRunner, 'queues', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'pricing_modality_configs', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'pricing_configs', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'service_desks', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'service_categories', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'service_catalogs', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'sige_products', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'sige_contracts', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'sige_clients', [
      'last_synced_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'client_contacts', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'license_history', ['created_at']);

    await this.revertTableColumns(queryRunner, 'license_device_assignments', [
      'created_at',
    ]);

    await this.revertTableColumns(queryRunner, 'contract_resource_quotas', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'agent_tickets', ['created_at']);

    await this.revertTableColumns(queryRunner, 'agent_chat_messages', [
      'read_at',
      'created_at',
    ]);

    await this.revertTableColumns(queryRunner, 'agent_activation_codes', [
      'expires_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'resource_licenses', [
      'activated_at',
      'deactivated_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'resource_history', ['created_at']);

    await this.revertTableColumns(queryRunner, 'resources', [
      'last_seen_at',
      'pending_command_at',
      'agent_installed_at',
      'agent_last_heartbeat',
      'os_last_updated',
      'antivirus_last_updated',
      'retired_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'users', [
      'last_login_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'timesheets', [
      'start_time',
      'end_time',
      'synced_at',
      'approved_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'checklists', [
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'ticket_valuations', [
      'approved_at',
      'synced_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'ticket_followers', ['created_at']);

    await this.revertTableColumns(queryRunner, 'ticket_checklists', [
      'completed_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'ticket_attachments', ['created_at']);

    await this.revertTableColumns(queryRunner, 'ticket_history', ['created_at']);

    await this.revertTableColumns(queryRunner, 'ticket_approvals', [
      'expires_at',
      'responded_at',
      'email_sent_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'ticket_appointments', [
      'timer_started_at',
      'timer_stopped_at',
      'approved_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'ticket_comments', [
      'sent_at',
      'edited_at',
      'created_at',
      'updated_at',
    ]);

    await this.revertTableColumns(queryRunner, 'tickets', [
      'created_at',
      'updated_at',
      'closed_at',
      'started_at',
      'paused_at',
    ]);

    console.log('\n✓ Reversão concluída!');
  }

  private async revertTableColumns(
    queryRunner: QueryRunner,
    tableName: string,
    columns: string[],
  ): Promise<void> {
    for (const column of columns) {
      try {
        // Verifica se coluna existe e é timestamptz
        const columnInfo = await queryRunner.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = '${tableName}' AND column_name = '${column}'
        `);

        if (columnInfo.length > 0 && columnInfo[0].data_type === 'timestamp with time zone') {
          await queryRunner.query(`
            ALTER TABLE "${tableName}"
            ALTER COLUMN "${column}" TYPE timestamp
            USING "${column}" AT TIME ZONE 'America/Sao_Paulo'
          `);

          console.log(`  ✓ ${tableName}.${column} -> timestamp`);
        }
      } catch (error) {
        console.error(`  ✗ Erro ao reverter ${tableName}.${column}:`, error.message);
      }
    }
  }
}
