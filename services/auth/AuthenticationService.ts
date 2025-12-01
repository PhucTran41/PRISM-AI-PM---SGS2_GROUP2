import type { User } from "@/prisma/generated/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  CheckUsernameAvailability,
  CreateUserInput,
  CreateUserInputWithCode,
  CreateUserResponse,
  LoginUserTokenPayload,
  UserProfileResponse,
} from "./types";
import { ValidationService } from "./ValidationService";
import { VerificationService } from "./VerificationService";

const uuidSchema = z.string().uuid();
const emailSchema = z.email();

export class AuthenticationService {
  constructor(
    private readonly validationService: ValidationService,
    private readonly verificationService: VerificationService
  ) {}

  private mapUserResponse(user: User): UserProfileResponse {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      googleAuth: user.googleAuth,
      githubAuth: user.githubAuth,
    };
  }

  async isExistingUser(username: string) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    if (existingUser) {
      throw new Error(
        "This username is already taken (case-insensitive). Please choose a different username."
      );
    }
  }

  async isExistingEmail(email: string) {
    const emailCheck = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (emailCheck) {
      throw new Error(
        "This email is already registered. Please use a different email."
      );
    }
  }

  generateToken(
    id: string,
    username: string,
    googleAuth = false,
    githubAuth = false
  ): string {
    if (!uuidSchema.safeParse(id).success) {
      throw new Error("Internal error: invalid user ID");
    }
    const payload: LoginUserTokenPayload = {
      id,
      username,
      googleAuth,
      githubAuth,
    };
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });
  }

  async checkUsernameAvailability(
    data: CheckUsernameAvailability
  ): Promise<boolean> {
    const cleanUsername = this.validationService.validateName(data.username);

    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    return !!existingUser;
  }

  async initiateSignUp(data: CreateUserInput): Promise<void> {
    const cleanUsername = this.validationService.validateName(data.username);
    this.validationService.validateName(data.displayName);
    const cleanEmail = this.validationService.validateEmail(data.email);

    await this.isExistingEmail(cleanEmail);

    if (await this.checkUsernameAvailability({ username: cleanUsername })) {
      throw new Error(
        "Username is unavailable. Try adding numbers, letters, underscores _ , or periods."
      );
    }

    await this.verificationService.sendEmailVerificationCode(cleanEmail);
  }

  getRandomAvatar() {
    const avatars = [
      "https://traveloka.uno/1762502018641-discord-default-avatar-1.png",
      "https://traveloka.uno/1762502018645-discord-default-avatar-2.png",
      "https://traveloka.uno/1762502018594-discord-default-avatar-3.png",
      "https://traveloka.uno/1762502018706-discord-default-avatar-4.png",
      "https://traveloka.uno/1762502018589-discord-default-avatar-5.png",
    ];

    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex];
  }

  async finalizeSignUp(
    data: CreateUserInputWithCode
  ): Promise<CreateUserResponse> {
    const cleanEmail = this.validationService.validateEmail(data.email);
    const cleanUsername = this.validationService.validateName(data.username);
    const cleanDisplayName = this.validationService.validateName(
      data.displayName
    );
    const cleanPassword = this.validationService.validatePassword(
      data.password
    );

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const userWithoutPassword = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          username: cleanUsername,
          displayName: cleanDisplayName,
          email: cleanEmail,
          password: hashedPassword,
          avatarUrl: this.getRandomAvatar(),
          googleAuth: false,
          githubAuth: false,
        },
      });

      await tx.emailVerificationCode.deleteMany({
        where: {
          email: cleanEmail,
        },
      });

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        googleAuth: user.googleAuth,
        githubAuth: user.githubAuth,
      };
    });

    return userWithoutPassword;
  }

  async login(
    identifier: string,
    password?: string,
    token?: string
  ): Promise<{ token: string; data: UserProfileResponse }> {
    if (!identifier || typeof identifier !== "string") {
      throw new Error("Username or email must be a non-empty string");
    }

    let cleanIdentifier: string;
    const isEmail = emailSchema.safeParse(identifier).success;
    if (isEmail) {
      cleanIdentifier = this.validationService.validateEmail(identifier);
    } else {
      cleanIdentifier = this.validationService.validateName(identifier);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanIdentifier, mode: "insensitive" } },
          { email: cleanIdentifier },
        ],
      },
    });

    if (!user) {
      throw new Error("User or email not found");
    }

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as LoginUserTokenPayload;
        if (
          decoded.id !== user.id ||
          decoded.googleAuth !== user.googleAuth ||
          decoded.githubAuth !== user.githubAuth
        ) {
          throw new Error("Invalid token");
        }
      } catch {
        throw new Error("Invalid or expired token");
      }
    } else if (password && !user.googleAuth && !user.githubAuth) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error("Invalid password");
      }
    } else if (!user.googleAuth && !user.githubAuth) {
      console.log(`Generating new token for manual user: ${cleanIdentifier}`);
    } else if (password && (user.googleAuth || user.githubAuth)) {
      throw new Error(
        "This account uses a social login. Please use Google or GitHub to sign in."
      );
    } else if (user.googleAuth || user.githubAuth) {
      throw new Error(
        "This account uses a social login. Please use the appropriate provider to sign in or provide a valid token."
      );
    }

    const authToken = this.generateToken(
      user.id,
      user.username,
      user.googleAuth,
      user.githubAuth
    );

    return {
      token: authToken,
      data: this.mapUserResponse(user),
    };
  }
}
