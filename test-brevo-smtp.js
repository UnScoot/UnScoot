// Test Brevo SMTP Connection
// Run: node test-brevo-smtp.js

const nodemailer = require('nodemailer');

async function testBrevoSMTP() {
  console.log('🧪 Testing Brevo SMTP Connection...\n');

  // Brevo SMTP Configuration (UPDATED - CORRECT USERNAME!)
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: '995168001@smtp-brevo.com', // ✅ FIXED: Was 9958600, now 995168001
      pass: 'g1K3xhydvYJ2sSzb'
    },
    debug: true, // Show debug logs
    logger: true // Show all logs
  });

  console.log('📧 Verifying SMTP connection...');
  
  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP Connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: '"UnScoot Test" <ichlasridho44@gmail.com>',
      to: 'ichlasridho44@gmail.com', // Send to yourself for testing
      subject: 'Test Email from UnScoot - Brevo SMTP',
      text: 'This is a test email to verify Brevo SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #33cc66;">✅ Brevo SMTP Test Successful!</h2>
          <p>This email was sent successfully using Brevo SMTP.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: smtp-relay.brevo.com</li>
            <li>Port: 587</li>
            <li>User: 9958600@smtp-brevo.com</li>
            <li>From: ichlasridho44@gmail.com</li>
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📨 Response:', info.response);
    console.log('\n🎉 Test completed successfully! Check your inbox.');

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Check:');
      console.log('   - Username: 9958600@smtp-brevo.com');
      console.log('   - Password: g1K3xhydvYJ2sSzb');
      console.log('   - Brevo SMTP API key valid?');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection failed. Check:');
      console.log('   - Internet connection');
      console.log('   - Firewall settings');
      console.log('   - SMTP host and port');
    }
  }
}

testBrevoSMTP();
