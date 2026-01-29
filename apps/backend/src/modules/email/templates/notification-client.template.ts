export interface ClientNotificationData {
  clientName: string;
  title: string;
  message: string;
  productName?: string;
  expiryDate?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export const clientNotificationTemplate = (data: ClientNotificationData): string => `
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
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">⚠️ Aviso de Vencimento de Licença</h1>
    </div>

    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        Olá, <strong>${data.clientName}</strong>!
      </p>

      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">
        ${data.title}
      </h2>

      <p style="margin: 0 0 25px 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
        ${data.message}
      </p>

      ${data.productName || data.expiryDate ? `
      <!-- License Details -->
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        ${data.productName ? `
        <p style="margin: 0 0 10px 0;">
          <strong style="color: #78350f;">Produto:</strong>
          <span style="color: #92400e; font-size: 16px; font-weight: 600;">${data.productName}</span>
        </p>
        ` : ''}
        ${data.expiryDate ? `
        <p style="margin: 0;">
          <strong style="color: #78350f;">Data de Vencimento:</strong>
          <span style="color: #dc2626; font-size: 16px; font-weight: 700;">${data.expiryDate}</span>
        </p>
        ` : ''}
      </div>
      ` : ''}

      <!-- Action Info -->
      <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid: #10b981;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #065f46;">
          🔄 Renove sua Licença
        </h3>
        <p style="margin: 0 0 15px 0; color: #047857; line-height: 1.6;">
          Para garantir a continuidade dos serviços sem interrupções, entre em contato conosco para renovar sua licença.
        </p>
        <p style="margin: 0; color: #047857; font-weight: 600;">
          Nossa equipe está pronta para auxiliá-lo!
        </p>
      </div>

      <!-- Contact Info -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1f2937;">
          📞 Entre em Contato
        </h3>
        ${data.contactPhone ? `
        <p style="margin: 0 0 8px 0; color: #4b5563;">
          <strong>Telefone:</strong>
          <a href="tel:${data.contactPhone.replace(/\D/g, '')}" style="color: #2563eb; text-decoration: none; font-weight: 600;">
            ${data.contactPhone}
          </a>
        </p>
        ` : ''}
        ${data.contactEmail ? `
        <p style="margin: 0; color: #4b5563;">
          <strong>Email:</strong>
          <a href="mailto:${data.contactEmail}" style="color: #2563eb; text-decoration: none; font-weight: 600;">
            ${data.contactEmail}
          </a>
        </p>
        ` : ''}
      </div>

      <!-- Warning Box -->
      <div style="margin-top: 25px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>⏰ Importante:</strong> Após o vencimento, o serviço será suspenso automaticamente até a renovação.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0; font-weight: 600; color: #4b5563;">Infoservice - Sys-Ticket</p>
      <p style="margin: 5px 0 0 0;">Este é um email automático de aviso.</p>
      <p style="margin: 5px 0 0 0;">Para dúvidas ou renovação, entre em contato conosco.</p>
    </div>
  </div>
</body>
</html>
`;
