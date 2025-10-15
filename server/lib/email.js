import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, '..', 'logs');
const outbox = path.join(logDir, 'outbox.log');

fs.mkdirSync(logDir, { recursive: true });

function formatEntry({ to, subject, body }) {
  const timestamp = new Date().toISOString();
  return `\n[${timestamp}]\nTO: ${to}\nSUBJECT: ${subject}\n${body}\n`;
}

export const emailService = {
  sendInvite({ to, projectName, inviteLink, role }) {
    const subject = `You're invited to join ${projectName}`;
    const body = `Hello,\n\nYou have been invited as ${role} to the project "${projectName}". Click the link below to access the portal and accept the invite:\n${inviteLink}\n\nIf you were not expecting this email, you can ignore it.\n`;
    const entry = formatEntry({ to, subject, body });
    fs.appendFileSync(outbox, entry, 'utf8');
    // For dev visibility
    console.log(`[Email queued] Sent invite to ${to}: ${inviteLink}`);
  }
};
