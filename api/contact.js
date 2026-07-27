const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const envContents = fs.readFileSync(envPath, 'utf8');
  envContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const ipRequests = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const requests = ipRequests.get(ip) || [];
  const recentRequests = requests.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequests.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  ipRequests.set(ip, recentRequests);
  return false;
}

function sanitizeValue(value, maxLength = 2000) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload);
    return;
  }

  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function validatePayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    errors.push('Invalid request payload.');
    return { errors, values: {} };
  }

  const name = sanitizeValue(body.name, 120);
  const email = sanitizeValue(body.email, 160).toLowerCase();
  const phone = sanitizeValue(body.phone, 40);
  const practice = sanitizeValue(body.practice, 160);
  const service = sanitizeValue(body.service, 120);
  const message = sanitizeValue(body.message, 2000);

  if (!name || name.length < 2) errors.push('Name is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required.');
  if (!phone) errors.push('Phone number is required.');
  if (!message) errors.push('Message is required.');

  return { errors, values: { name, email, phone, practice, service, message } };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  if (isRateLimited(req)) {
    sendJson(res, 429, { error: 'Too many requests. Please try again later.' });
    return;
  }

  let body = {};
  try {
    body = req.body || {};
  } catch (error) {
    body = {};
  }

  const validation = validatePayload(body);
  if (validation.errors.length) {
    sendJson(res, 400, { error: validation.errors[0] });
    return;
  }

  const { values } = validation;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const to = process.env.SMTP_TO;

  if (!host || !user || !pass || !from || !to) {
    sendJson(res, 500, { error: 'Email service is not configured.' });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const mailOptions = {
      from,
      to,
      replyTo: values.email,
      subject: `New dental support inquiry from ${values.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h3 style="margin-bottom: 0.5rem;">New contact submission</h3>
          <p><strong>Name:</strong> ${values.name}</p>
          <p><strong>Email:</strong> ${values.email}</p>
          <p><strong>Phone:</strong> ${values.phone}</p>
          <p><strong>Practice:</strong> ${values.practice || 'Not provided'}</p>
          <p><strong>Service:</strong> ${values.service || 'Not provided'}</p>
          <p><strong>Message:</strong><br/>${values.message}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    sendJson(res, 200, { message: 'Thanks! We will reach out shortly.' });
  } catch (error) {
    sendJson(res, 500, { error: 'Unable to send email at this time. Please try again later.' });
  }
};
