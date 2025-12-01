import nodemailer from "nodemailer";

const globalForNodeMailer = globalThis as unknown as {
  __nodemailer?: nodemailer.Transporter;
};
export const getNodeMailer = (): nodemailer.Transporter => {
  if (globalForNodeMailer.__nodemailer) {
    return globalForNodeMailer.__nodemailer;
  }
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (!emailUser || !emailPass) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS environment variables are required"
    );
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPass },
  });
  globalForNodeMailer.__nodemailer = transporter;
  return transporter;
};
