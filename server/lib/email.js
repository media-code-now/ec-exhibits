import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, '..', 'logs');
const outbox = path.join(logDir, 'outbox.log');

fs.mkdirSync(logDir, { recursive: true });

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // This should be a Gmail App Password
  }
});

// Log email configuration on startup
console.log('[EMAIL] Service configured:', process.env.EMAIL_USER ? 'Gmail' : 'Not configured (will log to file)');

function formatEntry({ to, subject, body }) {
  const timestamp = new Date().toISOString();
  return `\n[${timestamp}]\nTO: ${to}\nSUBJECT: ${subject}\n${body}\n`;
}

// Helper function to send email via Gmail or log to file if not configured
async function sendEmail({ to, subject, html, text }) {
  // If Gmail is not configured, fall back to file logging
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const entry = formatEntry({ to, subject, body: text || html });
    fs.appendFileSync(outbox, entry, 'utf8');
    console.log(`[EMAIL] Not configured - logged to file for ${to}: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"EC Exhibits" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || '',
      html: html || text || ''
    });
    
    console.log(`[EMAIL] ✅ Sent to ${to}: ${subject} (Message ID: ${info.messageId})`);
    
    // Also log to file for record keeping
    const entry = formatEntry({ to, subject, body: text || html });
    fs.appendFileSync(outbox, entry, 'utf8');
  } catch (error) {
    console.error(`[EMAIL] ❌ Failed to send to ${to}:`, error.message);
    // Log to file as fallback
    const entry = formatEntry({ to, subject, body: `ERROR: ${error.message}\n${text || html}` });
    fs.appendFileSync(outbox, entry, 'utf8');
  }
}

export const emailService = {
  async sendInvite({ to, projectName, inviteLink, role }) {
    const subject = `You're invited to join ${projectName}`;
    const text = `Hello,\n\nYou have been invited as ${role} to the project "${projectName}". Click the link below to access the portal and accept the invite:\n${inviteLink}\n\nIf you were not expecting this email, you can ignore it.\n\nBest regards,\nEC Exhibits Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Project Invitation</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have been invited as <strong>${role}</strong> to the project:</p>
            <h2 style="color: #667eea;">${projectName}</h2>
            <p>Click the button below to access the portal and accept your invitation:</p>
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${inviteLink}</p>
            <p style="margin-top: 30px; font-size: 14px; color: #666;">If you were not expecting this email, you can safely ignore it.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>EC Exhibits Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({ to, subject, html, text });
  },

  async sendNotification({ to, subject, html, text }) {
    await sendEmail({ to, subject, html, text });
  },

  async sendTaskNotification({ to, userName, projectName, taskTitle, stageName, dueDate, assignee, projectId, clientUrl }) {
    const subject = `New task in ${projectName}`;
    const text = `Hello,\n\n${userName} created a new task in ${projectName}:\n\nTask: ${taskTitle}\nStage: ${stageName}${dueDate ? `\nDue: ${new Date(dueDate).toLocaleDateString()}` : ''}${assignee ? `\nAssigned to: ${assignee}` : ''}\n\nView project: ${clientUrl}/projects/${projectId}\n\nBest regards,\nEC Exhibits Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .task-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Task Created</h1>
          </div>
          <div class="content">
            <p><strong>${userName}</strong> created a new task in <strong>${projectName}</strong>:</p>
            <div class="task-info">
              <h3 style="color: #667eea; margin-top: 0;">${taskTitle}</h3>
              <p><strong>Stage:</strong> ${stageName}</p>
              ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
              ${assignee ? `<p><strong>Assigned to:</strong> ${assignee}</p>` : ''}
            </div>
            <div style="text-align: center;">
              <a href="${clientUrl}/projects/${projectId}" class="button">View Project</a>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>EC Exhibits Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({ to, subject, html, text });
  },

  async sendFileUploadNotification({ to, userName, projectName, fileName, projectId, clientUrl }) {
    const subject = `New file uploaded to ${projectName}`;
    const text = `Hello,\n\n${userName} uploaded a new file to ${projectName}:\n\nFile: ${fileName}\n\nView project: ${clientUrl}/projects/${projectId}\n\nBest regards,\nEC Exhibits Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .file-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📎 New File Uploaded</h1>
          </div>
          <div class="content">
            <p><strong>${userName}</strong> uploaded a new file to <strong>${projectName}</strong>:</p>
            <div class="file-info">
              <p style="font-size: 16px; margin: 0;"><strong>${fileName}</strong></p>
            </div>
            <div style="text-align: center;">
              <a href="${clientUrl}/projects/${projectId}" class="button">View Project</a>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>EC Exhibits Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({ to, subject, html, text });
  },

  async sendInvoiceNotification({ to, userName, projectName, invoiceType, amount, projectId, clientUrl }) {
    const subject = `New invoice in ${projectName}`;
    const text = `Hello,\n\n${userName} created a new ${invoiceType} invoice in ${projectName}:\n\nAmount: $${amount}\n\nView project: ${clientUrl}/projects/${projectId}\n\nBest regards,\nEC Exhibits Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .invoice-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 New Invoice</h1>
          </div>
          <div class="content">
            <p><strong>${userName}</strong> created a new invoice in <strong>${projectName}</strong>:</p>
            <div class="invoice-info">
              <p><strong>Type:</strong> ${invoiceType}</p>
              <p><strong>Amount:</strong> <span style="font-size: 20px; color: #667eea;">$${amount}</span></p>
            </div>
            <div style="text-align: center;">
              <a href="${clientUrl}/projects/${projectId}" class="button">View Invoice</a>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>EC Exhibits Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail({ to, subject, html, text });
  }
};
