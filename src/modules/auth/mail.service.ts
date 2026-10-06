import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurada en el archivo .env');
    }

    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const from = this.configService.get<string>('MAIL_FROM');

    if (!from) {
      throw new InternalServerErrorException('MAIL_FROM no está configurado.');
    }

    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Recuperación de contraseña - Drakios',
      html: `
          <!DOCTYPE html>
          <html lang="es">
            <head>
              <meta charset="UTF-8" />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <title>
                Recuperación de contraseña
              </title>
            </head>

            <body
              style="
                margin: 0;
                padding: 0;
                background-color: #f4f6f8;
                font-family: Arial, sans-serif;
              "
            >
              <div
                style="
                  max-width: 600px;
                  margin: 40px auto;
                  background: #ffffff;
                  border-radius: 12px;
                  padding: 40px;
                  box-sizing: border-box;
                "
              >
                <h1
                  style="
                    margin-top: 0;
                    color: #212529;
                  "
                >
                  Recuperar contraseña
                </h1>

                <p
                  style="
                    color: #495057;
                    line-height: 1.6;
                  "
                >
                  Hemos recibido una solicitud
                  para restablecer la contraseña
                  de tu cuenta en Drakios.
                </p>

                <p
                  style="
                    color: #495057;
                    line-height: 1.6;
                  "
                >
                  Haz clic en el siguiente botón
                  para crear una nueva contraseña:
                </p>

                <div
                  style="
                    text-align: center;
                    margin: 32px 0;
                  "
                >
                  <a
                    href="${resetUrl}"
                    style="
                      display: inline-block;
                      background-color: #0d6efd;
                      color: #ffffff;
                      padding: 14px 24px;
                      border-radius: 8px;
                      text-decoration: none;
                      font-weight: bold;
                    "
                  >
                    Restablecer contraseña
                  </a>
                </div>

                <p
                  style="
                    color: #6c757d;
                    line-height: 1.6;
                  "
                >
                  Este enlace será válido durante
                  <strong>15 minutos</strong>.
                </p>

                <p
                  style="
                    color: #6c757d;
                    line-height: 1.6;
                  "
                >
                  Si tú no solicitaste este cambio,
                  puedes ignorar este correo.
                </p>

                <hr
                  style="
                    border: 0;
                    border-top: 1px solid #dee2e6;
                    margin: 32px 0;
                  "
                />

                <p
                  style="
                    color: #adb5bd;
                    font-size: 12px;
                  "
                >
                  Drakios - Sistema comercial
                </p>
              </div>
            </body>
          </html>
        `,
    });

    if (error) {
      console.error('[MAIL] Error enviando correo de recuperación:', error);

      throw new InternalServerErrorException(
        'No se pudo enviar el correo de recuperación.',
      );
    }
  }
}
