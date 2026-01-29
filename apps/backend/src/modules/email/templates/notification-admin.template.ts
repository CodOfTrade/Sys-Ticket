export interface AdminNotificationData {
  userName: string;
  title: string;
  message: string;
  licenseKey?: string;
  productName?: string;
  clientName?: string;
  expiryDate?: string;
  systemLink: string;
}

export const adminNotificationTemplate = (data: AdminNotificationData): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Sys-Ticket - Alerta de Licença</h1>
    </div>

    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Olá <strong>${data.userName}</strong>,
      </p>

      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">
        ${data.title}
      </h2>

      <p style="margin: 0 0 25px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
        ${data.message}
      </p>

      ${data.licenseKey ? `
      <!-- License Details -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          ${data.clientName ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
              <strong style="color: #6b7280;">Cliente:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
              <strong>${data.clientName}</strong>
            </td>
          </tr>
          ` : ''}
          ${data.productName ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">Produto:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
              ${data.productName}
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <strong style="color: #6b7280;">Chave/Serial:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-family: 'Courier New', monospace;">
              ${data.licenseKey}
            </td>
          </tr>
          ${data.expiryDate ? `
          <tr>
            <td style="padding: 10px 0;">
              <strong style="color: #6b7280;">Data de Vencimento:</strong>
            </td>
            <td style="padding: 10px 0; color: #dc2626; font-weight: 600;">
              ${data.expiryDate}
            </td>
          </tr>
          ` : ''}
        </table>
      </div>
      ` : ''}

      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.systemLink}"
           style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);">
          Ver no Sistema
        </a>
      </div>

      <!-- Info Box -->
      <div style="margin-top: 25px; padding: 15px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>📌 Dica:</strong> Acesse o sistema para visualizar mais detalhes e tomar as ações necessárias.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0; font-weight: 600; color: #4b5563;">Infoservice - Sys-Ticket</p>
      <p style="margin: 5px 0 0 0;">Este é um email automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
`;
