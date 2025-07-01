import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter | null = null;
  private readonly logger = new Logger(MailService.name);
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = this.initializeTransporter();
  }

  private initializeTransporter(): boolean {
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        this.logger.warn('SMTP設定が不完全です。メール送信機能は無効化されます。');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465, // 465の場合はSSL、その他はSTARTTLS
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // 開発環境用
        },
      });

      this.logger.log('SMTP設定が完了しました。');
      return true;
    } catch (error) {
      this.logger.error('SMTP初期化エラー:', error);
      return false;
    }
  }

  /**
   * メール送信機能（共通）
   */
  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn(`メール送信スキップ（SMTP未設定）: ${to} - ${subject}`);
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.MAIL_FROM || 'noreply@example.com',
        to,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`メール送信成功: ${to} - ${subject} (ID: ${result.messageId})`);
      return true;
    } catch (error) {
      this.logger.error(`メール送信失敗: ${to} - ${subject}`, error);
      return false;
    }
  }

  /**
   * 初回パスワード設定メール送信
   */
  async sendInitialSetupMail(email: string, name: string, token: string): Promise<boolean> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/auth/initial-setup?token=${token}`;

    const subject = '【出社状況管理ボード】初回パスワード設定のご案内';
    const html = this.getInitialSetupTemplate(name, setupUrl);

    return this.sendMail(email, subject, html);
  }

  /**
   * パスワードリセットメール送信
   */
  async sendPasswordResetMail(email: string, name: string, token: string): Promise<boolean> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    const subject = '【出社状況管理ボード】パスワードリセットのご案内';
    const html = this.getPasswordResetTemplate(name, resetUrl);

    return this.sendMail(email, subject, html);
  }

  /**
   * 初回パスワード設定メールテンプレート
   */
  private getInitialSetupTemplate(name: string, setupUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>初回パスワード設定のご案内</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1F2937; color: white; text-align: center; padding: 20px;">
            <h1 style="margin: 0; font-size: 24px;">出社状況管理ボード</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">初回パスワード設定のご案内</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-left: 4px solid #14B8A6;">
            <h2 style="color: #1F2937; margin-top: 0;">初回パスワード設定のお願い</h2>
            
            <p>${name} 様</p>
            
            <p>出社状況管理ボードへのアクセス権限が付与されました。<br>
            初回ログインのため、パスワードの設定をお願いいたします。</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" 
                   style="background-color: #14B8A6; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold; 
                          display: inline-block;">
                    パスワードを設定する
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                ※ このリンクの有効期限は24時間です。<br>
                ※ リンクをクリックできない場合は、以下のURLをコピーしてブラウザのアドレスバーに貼り付けてください。
            </p>
            
            <p style="font-size: 12px; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
                ${setupUrl}
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
            <p>このメールに心当たりがない場合は、お手数ですが管理者までご連絡ください。</p>
            <p>出社状況管理ボード システム管理者</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * パスワードリセットメールテンプレート
   */
  private getPasswordResetTemplate(name: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>パスワードリセットのご案内</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1F2937; color: white; text-align: center; padding: 20px;">
            <h1 style="margin: 0; font-size: 24px;">出社状況管理ボード</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">パスワードリセットのご案内</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-left: 4px solid #EF4444;">
            <h2 style="color: #1F2937; margin-top: 0;">パスワードリセットのご案内</h2>
            
            <p>${name} 様</p>
            
            <p>パスワードリセットのリクエストを受け付けました。<br>
            以下のリンクをクリックして、新しいパスワードを設定してください。</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #EF4444; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold; 
                          display: inline-block;">
                    新しいパスワードを設定する
                </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
                ※ このリンクの有効期限は1時間です。<br>
                ※ リンクをクリックできない場合は、以下のURLをコピーしてブラウザのアドレスバーに貼り付けてください。
            </p>
            
            <p style="font-size: 12px; word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
                ${resetUrl}
            </p>
        </div>
        
        <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
            <p>パスワードリセットを申請していない場合は、このメールを無視してください。</p>
            <p>出社状況管理ボード システム管理者</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * SMTP設定状況の確認
   */
  isMailConfigured(): boolean {
    return this.isConfigured;
  }
}