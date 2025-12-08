import { z } from "zod";
export class ValidationService {
  validateName(username: string): string {
    const schema = z
      .string({ message: "Username must be a non-empty string" })
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(3, "Username must be between 3 and 50 characters")
          .max(50, "Username must be between 3 and 50 characters")
          .regex(
            /^[a-zA-Z0-9._ ]+$/,
            "Username can only contain letters, numbers, underscores, and periods"
          )
      );

    const result = schema.safeParse(username);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      throw new Error(msg);
    }
    return result.data.toLowerCase();
  }

  validateEmail(email: string): string {
    const schema = z
      .string({ message: "Email must be a non-empty string" })
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .max(255, "Email must not exceed 255 characters")
          .email("Email must be a valid email address")
      );
    const result = schema.safeParse(email);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      throw new Error(msg);
    }
    return result.data.toLowerCase();
  }

  validatePassword(password: string): string {
    const schema = z
      .string({ message: "Password must be a non-empty string" })
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(9, "Password must be between 9 and 128 characters")
          .max(128, "Password must be between 9 and 128 characters")
          .regex(
            /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{9,}$/,
            "Password must be at least 9 characters, with 1 uppercase, 1 number, and 1 special character (!@#$%^&*)"
          )
      );

    const result = schema.safeParse(password);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      throw new Error(msg);
    }
    return result.data;
  }

  validateVerificationCode(code: string): string {
    const schema = z
      .string({ message: "Reset code must be a non-empty string" })
      .transform((val) => val.trim())
      .pipe(z.string().regex(/^\d{6}$/, "Reset code must be a 6-digit number"));

    const result = schema.safeParse(code);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      throw new Error(msg);
    }
    return result.data;
  }
}
