export const emailVerificationMailOptions = (email: string, code: string) => ({
  from: process.env.EMAIL_USER!,
  to: email,
  subject: "PRISM – Verify your email",
  html: `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #2b2d31;
        font-family: "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: #dcddde;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #313338;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0,0,0,0.4);
      }
      .header {
        background: linear-gradient(90deg, #5865f2, #4752c4);
        text-align: center;
        padding: 40px 20px;
      }
      .logo {
        font-size: 28px;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .logo img {
        width: 40px;
        height: 40px;
      }
      .content {
        padding: 40px 30px;
        text-align: center;
      }
      .title {
        font-size: 22px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 12px;
      }
      .subtitle {
        color: #b9bbbe;
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 40px;
      }
      .code-box {
        background-color: #232428;
        border: 1px solid #1e1f22;
        border-radius: 8px;
        padding: 25px;
        margin: 0 auto 25px;
        width: fit-content;
        box-shadow: 0 0 15px rgba(0,0,0,0.2);
      }
      .code-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #8e9297;
        margin-bottom: 8px;
      }
      .code {
        font-family: "Courier New", monospace;
        font-size: 30px;
        font-weight: bold;
        color: #fff;
        letter-spacing: 8px;
      }
      .timer {
        color: #b9bbbe;
        background: #202225;
        border-radius: 20px;
        display: inline-block;
        padding: 10px 20px;
        font-size: 13px;
        margin-top: 10px;
      }
      .divider {
        height: 1px;
        background: #1e1f22;
        margin: 40px 0;
      }
      .footer {
        text-align: center;
        padding: 20px;
        color: #949ba4;
        font-size: 13px;
        background: #2b2d31;
      }
      .footer a {
        color: #5865f2;
        text-decoration: none;
        margin: 0 8px;
      }
      @media (max-width: 600px) {
        .content { padding: 30px 20px; }
        .code { font-size: 24px; letter-spacing: 5px; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">
          PRISM
        </div>
      </div>
      <div class="content">
        <div class="title">Hey there, new friend 👋</div>
        <div class="subtitle">
          To finish setting up your PRISM account, verify your email with the code below.
        </div>
        <div class="code-box">
          <div class="code-label">Verification Code</div>
          <div class="code">${code}</div>
        </div>
        <div class="timer">Expires in 15 minutes</div>
        <div class="divider"></div>
        <div class="subtitle">
          Welcome to the most chaotic, chill, and fun place on the internet. <br>
          Can’t wait to see you vibing in your first server 🎧
        </div>
      </div>
      <div class="footer">
        <div>© 2025 PRISM Inc.</div>
        <div style="margin-top:10px;">
          <a href="#">Privacy Policy</a> |
          <a href="#">Terms</a> |
          <a href="#">Support</a>
        </div>
        <div style="margin-top:15px; opacity:0.6;">
          Sent to ${email}
        </div>
      </div>
    </div>
  </body>
  </html>
  `,
  text: `Your PRISM verification code is ${code}. It expires in 15 minutes.`,
});
