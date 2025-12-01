// import { ValidationService } from "./ValidationService";
// import { AuthenticationService } from "./AuthenticationService";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { UserProfileResponse } from "./types";

const uuidSchema = z.string().uuid();

export class UserManagementService {
  constructor() // private readonly validationService: ValidationService,
  // private readonly authenticationService: AuthenticationService
  {}

  async getUserById(id: string): Promise<UserProfileResponse> {
    if (!uuidSchema.safeParse(id).success) {
      throw new Error("Invalid UUID format");
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        googleAuth: true,
        githubAuth: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
