import { ValidationService } from "./ValidationService";
import { prisma } from "../../lib/prisma";
import { getNodeMailer } from "@/lib/nodemailer";
import { VerificationType } from "./types";
import { emailVerificationMailOptions } from "./mails/EmailVerification";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class VerificationService {
  constructor(private readonly validationService: ValidationService) {}

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async verifyVerificationCode(
    code: string,
    type: VerificationType,
    email?: string,
    userId?: string
  ): Promise<boolean> {
    const cleanCode = this.validationService.validateVerificationCode(code);
    const shouldValidateEmail = email && type !== "changeEmail";
    const cleanEmail = shouldValidateEmail
      ? this.validationService.validateEmail(email)
      : undefined;

    let verificationRecord:
      | ({
          code: string;
          expires: Date;
        } & Partial<{
          verified: boolean;
        }>)
      | null = null;

    switch (type) {
      case "verifyEmail": {
        if (!cleanEmail) {
          throw new Error("Email is required to verify email address.");
        }
        verificationRecord = await prisma.emailVerificationCode.findUnique({
          where: { email: cleanEmail },
        });
        break;
      }
    }

    if (!verificationRecord) {
      const ref = cleanEmail ?? email ?? userId ?? "unknown";
      throw new Error(`No verification code found for ${ref}`);
    }

    if (verificationRecord.expires < new Date()) {
      throw new Error(
        `Verification code for ${
          cleanEmail ?? "this request"
        } has expired. Please request a new one.`
      );
    }

    if (verificationRecord.code !== cleanCode) {
      throw new Error(
        "The verification code you entered is incorrect. Please check it and try again."
      );
    }

    switch (type) {
      case "verifyEmail":
        await prisma.emailVerificationCode.update({
          where: { email: cleanEmail! },
          data: { verified: true },
        });
        break;
    }

    console.log(
      `Verification code verified for reference: ${
        cleanEmail ?? userId
      }, type: ${type}`
    );

    return true;
  }

  async sendEmailVerificationCode(email: string): Promise<void> {
    const cleanEmail = this.validationService.validateEmail(email);
    const code = this.generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await prisma.emailVerificationCode.upsert({
        where: { email: cleanEmail },
        update: {
          code,
          expires,
          created_at: new Date(),
          verified: false,
        },
        create: {
          email: cleanEmail,
          code,
          expires,
          created_at: new Date(),
        },
      });

      await getNodeMailer().sendMail(
        emailVerificationMailOptions(cleanEmail, code)
      );
      console.log(`Verification code sent to ${cleanEmail}`);
    } catch (error) {
      const message = toErrorMessage(error);
      throw new Error(
        `Failed to send verification code to ${cleanEmail}: ${message}`
      );
    }
  }
}
