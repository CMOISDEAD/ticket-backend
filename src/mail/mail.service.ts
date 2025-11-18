import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import * as QRCode from 'qrcode';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}
  private logger = new Logger(MailService.name);

  async sendEmail(to: string, subject: string, content: string) {
    await this.mailerService.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text: content,
    });

    this.logger.log(`Email sent to ${to} with subject: ${subject}`);
  }

  async sendWelcomeEmail(user: User) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: '👾 Bienvenido a QueBoleta',
      template: 'welcome',
      context: {
        activationLink: `${process.env.FRONTEND_URL}/auth/activate/${user.id}`,
        fullnames: `${user.fullnames} ${user.lastnames}`,
        couponCode: 'QBO25',
      },
    });
  }

  async sendLoginEmail(user: User) {
    await this.mailerService.sendMail({
      to: user.email,
      subject: '⚡ Inicio de sesión detectado',
      template: 'login',
      context: {
        fullnames: `${user.fullnames} ${user.lastnames}`,
      },
    });
  }

  async sendRequestPasswordResetEmail(user: User, token: string) {
    await this.mailerService.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        fullnames: `${user.fullnames} ${user.lastnames}`,
        resetLink: `${process.env.FRONTEND_URL}/auth/reset-password/${token}`,
      },
    });

    this.logger.log(
      `Reset password email sent to ${user.email} with subject: Password Request Reset`,
    );
  }

  async sendPasswordResetEmail(user: User) {
    const subject = 'Password has been reset successfully.';
    await this.mailerService.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject,
      template: 'password-changed',
      context: {
        fullnames: `${user.fullnames} ${user.lastnames}`,
      },
    });

    this.logger.log(
      `Reset password email sent to ${user.email} with subject: ${subject}`,
    );
  }

  async paymentAprovedEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        user: true,
        tickets: true,
        event: {
          include: {
            venue: true,
          },
        },
      },
    });

    if (!order)
      throw new NotFoundException(`Order with ID ${orderId} not found`);

    // Generate QR codes for each ticket
    const ticketsWithQR = await Promise.all(
      order.tickets.map(async (ticket) => {
        try {
          // Generate QR code as data URL (base64 image)
          const qrCodeDataUrl = await QRCode.toDataURL(ticket.id, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 1,
          });
          return {
            id: ticket.id,
            type: ticket.type,
            status: ticket.status,
            price: ticket.price,
            qrCode: qrCodeDataUrl,
          };
        } catch (error) {
          this.logger.error(`Error generating QR code for ticket ${ticket.id}:`, error);
          return {
            id: ticket.id,
            type: ticket.type,
            status: ticket.status,
            price: ticket.price,
            qrCode: null,
          };
        }
      }),
    );

    // Format event date
    const eventDate = new Date(order.event.date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Format prices
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    await this.mailerService.sendMail({
      from: process.env.MAIL_FROM,
      to: order.user.email,
      subject: `🎫 Tus boletas para ${order.event.name} - Orden ${order.id}`,
      template: 'order-paid',
      context: {
        orderId: order.id,
        orderTotal: formatPrice(order.total),
        userName: `${order.user.fullnames} ${order.user.lastnames}`,
        eventName: order.event.name,
        eventDate: eventDate,
        venueName: order.event.venue.name,
        venueAddress: order.event.venue.address,
        venueCity: order.event.venue.city,
        tickets: ticketsWithQR.map((ticket) => ({
          ...ticket,
          price: formatPrice(ticket.price),
        })),
        orderUrl: `${process.env.FRONTEND_URL}/orders/${order.id}`,
      },
    });

    this.logger.log(`payment approved email sent to ${order.user.email}`);
  }

  async paymentRejectedEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        tickets: true,
      },
    });

    if (!order)
      throw new NotFoundException(`Order with ID ${orderId} not found`);

    await this.mailerService.sendMail({
      from: process.env.MAIL_FROM,
      to: order.user.email,
      subject: `Order ${order.id} was rejected.`,
      template: 'order-rejected',
      context: {
        orderId: order.id,
      },
    });

    this.logger.log(`payment rejected email send`);
  }
}
