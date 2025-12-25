const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // 创建邮件传输器（以QQ邮箱为例，也可以使用其他邮件服务商）
        this.transporter = nodemailer.createTransport({  // 这里改为 createTransport
            host: 'smtp.qq.com', // SMTP服务器地址
            port: 587, // 端口
            secure: false, // 使用SSL
            auth: {
                user: process.env.EMAIL_USER, // 邮箱地址
                pass: process.env.EMAIL_PASS // 邮箱授权码，不是密码
            }
        });
    }

    /**
     * 发送密码重置邮件
     */
    async sendPasswordResetEmail(email, username, resetToken) {
        try {
            const resetLink = `${process.env.FRONTEND_URL}/account/reset-password.html?token=${resetToken}`;
            
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`, // 发件人
                to: email, // 收件人
                subject: 'CS2 Utility Guide - 密码重置请求', // 主题
                html: this.getPasswordResetTemplate(username, resetLink) // HTML内容
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('密码重置邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送邮件失败:', error);
            throw new Error('邮件发送失败，请稍后重试');
        }
    }

    /**
     * 发送验证码邮件
     */
    async sendVerificationCode(email, code) {
        try {
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'CS2 Utility Guide - 注册邮箱验证',
                html: this.getVerificationCodeTemplate(code)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('验证码邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送验证码邮件失败:', error);
            throw new Error('验证码邮件发送失败，请稍后重试');
        }
    }

    /**
     * 生成密码重置邮件模板
     */
    getPasswordResetTemplate(username, resetLink) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #e63946; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .code { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; word-break: break-all; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>密码重置请求</h2>
                <p>亲爱的 <strong>${username}</strong>，</p>
                <p>我们收到了您重置密码的请求。请点击下面的按钮来设置新密码：</p>
                
                <p style="text-align: center;">
                    <a href="${resetLink}" class="button">重置密码</a>
                </p>
                
                <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
                <div class="code">${resetLink}</div>
                
                <p><strong>请注意：</strong>此链接将在1小时后失效。</p>
                <p>如果您没有请求重置密码，请忽略此邮件。</p>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
        }

    /**
     * 生成验证码邮件模板
     */
    getVerificationCodeTemplate(code) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .code { font-size: 24px; letter-spacing: 5px; text-align: center; margin: 20px 0; padding: 10px; background: #f5f5f5; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>邮箱验证码</h2>
                <p>您的验证码为：</p>
                <div class="code">${code}</div>
                <p>该验证码10分钟内有效，请勿泄露给他人。</p>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
    }

    /**
     * 验证邮件配置
     */
    async verifyConfig() {
        try {
            await this.transporter.verify();
            console.log('邮件服务器配置成功');
            return true;
        } catch (error) {
            console.error('邮件服务器配置失败:', error);
            return false;
        }
    }

    /**
     * 发送注销账户验证码邮件
     */
    async sendDeleteVerificationCode(email, username, verificationCode) {
        try {
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'CS2 Utility Guide - 账户注销验证',
                html: this.getDeleteVerificationTemplate(username, verificationCode)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('注销验证码邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送注销验证码邮件失败:', error);
            throw new Error('注销验证码邮件发送失败，请稍后重试');
        }
    }
    
    /**
     * 生成注销验证邮件模板
     */
    getDeleteVerificationTemplate(username, verificationCode) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .code { font-size: 32px; letter-spacing: 8px; text-align: center; margin: 25px 0; padding: 15px; background: #f8f9fa; border: 2px dashed #dee2e6; font-weight: bold; color: #e63946; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .note { font-size: 12px; color: #666; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>账户注销验证</h2>
                <p>亲爱的 <strong>${username}</strong>，</p>
                
                <div class="warning">
                    <strong>⚠️ 重要安全提示：</strong><br>
                    我们收到了您注销账户的请求。此操作将永久删除您的所有数据且不可恢复！
                </div>
                
                <p>您的注销验证码为：</p>
                <div class="code">${verificationCode}</div>
                
                <p>请在注销页面输入此验证码以完成账户注销操作。</p>
                
                <div class="note">
                    <strong>请注意：</strong><br>
                    • 此验证码10分钟内有效<br>
                    • 如果您没有申请注销账户，请立即修改密码并联系客服<br>
                    • 验证码切勿泄露给他人
                </div>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
    }

    /**
     * 发送换绑邮箱验证码邮件（当前邮箱）
     */
    async sendChangeEmailVerification(email, username, verificationCode) {
        try {
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'CS2 Utility Guide - 换绑邮箱验证',
                html: this.getChangeEmailVerificationTemplate(username, verificationCode)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('换绑验证码邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送换绑验证码邮件失败:', error);
            throw new Error('验证码邮件发送失败，请稍后重试');
        }
    }

    /**
     * 发送新邮箱验证码邮件
     */
    async sendNewEmailVerification(email, verificationCode) {
        try {
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'CS2 Utility Guide - 新邮箱验证',
                html: this.getNewEmailVerificationTemplate(verificationCode)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('新邮箱验证码邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送新邮箱验证码邮件失败:', error);
            throw new Error('新邮箱验证码发送失败，请稍后重试');
        }
    }

    /**
     * 生成换绑邮箱验证模板（当前邮箱）
     */
    getChangeEmailVerificationTemplate(username, verificationCode) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .code { font-size: 32px; letter-spacing: 8px; text-align: center; margin: 25px 0; padding: 15px; background: #f8f9fa; border: 2px dashed #dee2e6; font-weight: bold; color: #e63946; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>换绑邮箱验证</h2>
                <p>亲爱的 <strong>${username}</strong>，</p>
                
                <div class="warning">
                    <strong>安全提示：</strong><br>
                    我们收到了您换绑邮箱的请求。请使用以下验证码验证您的身份：
                </div>
                
                <div class="code">${verificationCode}</div>
                
                <p>此验证码10分钟内有效，请勿泄露给他人。</p>
                <p>如果您没有申请换绑邮箱，请立即修改密码并联系客服。</p>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
    }

    /**
     * 生成新邮箱验证模板
     */
    getNewEmailVerificationTemplate(verificationCode) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .code { font-size: 32px; letter-spacing: 8px; text-align: center; margin: 25px 0; padding: 15px; background: #f8f9fa; border: 2px dashed #dee2e6; font-weight: bold; color: #e63946; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>新邮箱验证</h2>
                <p>感谢您选择CS2 Utility Guide！</p>
                <p>请使用以下验证码完成邮箱绑定：</p>
                
                <div class="code">${verificationCode}</div>
                
                <p>此验证码10分钟内有效，请勿泄露给他人。</p>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
    }

    /**
     * 发送密码修改通知邮件
     */
    async sendPasswordChangeNotification(username, email) {
        try {
            const mailOptions = {
                from: `"CS2 Utility Guide" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'CS2 Utility Guide - 密码修改通知',
                html: this.getPasswordChangeTemplate(username)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('密码修改通知邮件发送成功:', result.messageId);
            return true;
        } catch (error) {
            console.error('发送密码修改通知邮件失败:', error);
            throw new Error('通知邮件发送失败');
        }
    }

    /**
     * 生成密码修改通知邮件模板
     */
    getPasswordChangeTemplate(username) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
            .header { background: #101218; color: white; padding: 20px; text-align: center; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info-box { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CS2 Utility Guide</h1>
            </div>
            <div class="content">
                <h2>密码修改通知</h2>
                <p>亲爱的 <strong>${username}</strong>，</p>
                
                <div class="info-box">
                    <p>您的账户密码已于 <strong>${new Date().toLocaleString('zh-CN')}</strong> 成功修改。</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ 安全提示：</strong><br>
                    • 如果您本人进行了此操作，请忽略此邮件<br>
                    • 如果您未进行此操作，请立即<a href="${process.env.FRONTEND_URL}/account/forgot-password.html" style="color: #e63946;">重置密码</a><br>
                    • 建议定期更换密码以确保账户安全
                </div>
                
                <p>如有任何疑问，请及时联系我们的客服团队。</p>
            </div>
            <div class="footer">
                <p>© 2025 CS2 Utility Guide. 所有权利保留。</p>
            </div>
        </div>
    </body>
    </html>`;
    }
}

module.exports = new EmailService();