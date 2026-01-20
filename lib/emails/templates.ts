
export const getEmailStyles = () => `
  body { font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f1f5f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  .wrapper { width: 100%; background-color: #f1f5f9; padding: 40px 0; }
  .container { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
  .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
  .logo { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -1px; margin: 0; text-transform: lowercase; }
  .content { padding: 48px 32px; background-color: #ffffff; }
  .greeting { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 24px; line-height: 1.3; letter-spacing: -0.5px; }
  .message { margin-bottom: 36px; color: #475569; font-size: 16px; line-height: 1.7; }
  .button-container { text-align: left; margin: 36px 0 12px; }
  .button { display: inline-block; background-color: #10b981; background-image: linear-gradient(to right, #10b981, #059669); color: #ffffff; padding: 16px 36px; border-radius: 14px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); transition: transform 0.2s, box-shadow 0.2s; }
  .footer { background-color: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #f1f5f9; }
  .footer-name { font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 4px; }
  .footer-role { color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 16px; letter-spacing: 0.5px; text-transform: uppercase; }
  .footer-links { margin-top: 20px; }
  .footer-email { color: #10b981; text-decoration: none; font-weight: 600; font-size: 13px; opacity: 0.9; }
  .copyright { margin-top: 24px; color: #94a3b8; font-size: 11px; }
`;

const wrapEmail = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${getEmailStyles()}</style>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">hookory.</div>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <div class="footer-name">Arup Saha</div>
        <div class="footer-role">CEO, Hookory</div>
        <a href="mailto:growwitharup@gmail.com" class="footer-email">growwitharup@gmail.com</a>
        <div class="copyright">
          &copy; ${new Date().getFullYear()} Hookory. All rights reserved.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeEmailTemplate = (name: string) => {
  const content = `
    <div class="greeting">Welcome to Hookory, ${name}! 🎉</div>
    <div class="message">
      We're absolutely thrilled to have you here. Hookory is built to transform how you repurpose content, helping you grow your audience with less effort and more impact.
      <br><br>
      You've just taken the first step towards a smarter content workflow. Your dashboard is ready and waiting for your first creation.
    </div>
    <div class="button-container">
      <a href="https://hookory.com/dashboard" class="button">Go to Dashboard</a>
    </div>
  `;
  return wrapEmail("Welcome to Hookory", content);
};

export const getPaymentSuccessEmailTemplate = (name: string, planName: string) => {
  const content = `
    <div class="greeting">You're All Set, ${name}! 🚀</div>
    <div class="message">
      Fantastic news! You've successfully upgraded to the <strong>${planName}</strong> plan. You've officially unlocked the full power of Hookory.
      <br><br>
      Unlimited possibilities await. We're excited to see what you build next with these premium features.
    </div>
    <div class="button-container">
      <a href="https://hookory.com/dashboard" class="button">Access Premium Features</a>
    </div>
  `;
  return wrapEmail("Payment Successful", content);
};

export const getPaymentDeclinedEmailTemplate = (name: string) => {
  const content = `
    <div class="greeting">Action Required: Payment Failed</div>
    <div class="message">
      Hi ${name},<br><br>
      We ran into a small hiccup processing your subscription payment. Don't worry, your data is safe, but we need you to update your payment details to keep your Creator features active.
      <br><br>
      Please take a moment to check your billing information.
    </div>
    <div class="button-container">
      <a href="https://hookory.com/settings" class="button">Update Payment Method</a>
    </div>
  `;
  return wrapEmail("Payment Action Required", content);
};

export const getSubscriptionEndedEmailTemplate = (name: string) => {
  const content = `
    <div class="greeting">Your Subscription Has Ended</div>
    <div class="message">
      Hi ${name},<br><br>
      Your Creator plan subscription has ended or has been refunded. Your account has been switched back to the Free plan.
      <br><br>
      We're sorry to see you go! If you ever decide to jump back in, we'll be here ready to help you grow.
    </div>
    <div class="button-container">
      <a href="https://hookory.com/dashboard" class="button">Go to Dashboard</a>
    </div>
  `;
  return wrapEmail("Subscription Update", content);
};

export const getFeedbackReceivedEmailTemplate = (name: string) => {
  const content = `
    <div class="greeting">We Got It! 🙌</div>
    <div class="message">
      Thanks a ton for your feedback, ${name}. We truly appreciate you taking the time to share your thoughts with us.
      <br><br>
      We read every single message to make Hookory better for creators like you. Your voice drives our innovation.
    </div>
    <div class="button-container">
      <a href="https://hookory.com/dashboard" class="button">Back to Dashboard</a>
    </div>
  `;
  return wrapEmail("We Received Your Feedback", content);
};

export const getReviewReceivedEmailTemplate = (name: string) => {
  const content = `
    <div class="greeting">You're Awesome, ${name}! ⭐</div>
    <div class="message">
      Thank you for sharing your review of Hookory. Support from creators like you means the world to us.
      <br><br>
      We're honored to have you as part of our community. Let's keep growing together!
    </div>
    <div class="button-container">
      <a href="https://hookory.com/dashboard" class="button">Back to Dashboard</a>
    </div>
  `;
  return wrapEmail("Thanks for your Review", content);
};
