const nodemailer = require('nodemailer');

function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

async function sendResetCodeEmail(email, code) {
  const transporter = createTransporter();
  const subject = `${code} adalah Kode Verifikasi Reset Password Scientia Advantage`;
  const text = `Halo,\n\nKami menerima permintaan untuk mereset kata sandi akun Scientia Advantage Anda.\n\nKode verifikasi Anda adalah: ${code}\n\nKode ini berlaku selama 15 menit. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.\n\nSalam,\nTim Scientia Advantage`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0F2A4A; text-align: center;">Scientia Advantage</h2>
      <p>Halo,</p>
      <p>Kami menerima permintaan untuk mereset kata sandi akun Scientia Advantage Anda.</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #B8963E; background: #FAF8F1; padding: 12px 24px; border-radius: 8px; border: 1px dashed #B8963E;">${code}</span>
      </div>
      <p style="color: #64748b; font-size: 14px;">Kode verifikasi ini berlaku selama <strong>15 menit</strong>. Jangan bagikan kode ini kepada siapa pun.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px;">Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
    </div>
  `;

  if (!transporter) {
    // Mode pengembangan / belum konfigurasi SMTP: cetak ke terminal
    console.log('\n======================================================');
    console.log(`[EMAIL SIMULASI] Kepada: ${email}`);
    console.log(`[KODE RESET PASSWORD]: ${code}`);
    console.log('======================================================\n');
    return { simulated: true, code };
  }

  return await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Scientia Advantage" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text,
    html,
  });
}

module.exports = { sendResetCodeEmail };

