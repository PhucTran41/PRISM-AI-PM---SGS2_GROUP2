import { VerificationService } from "./VerificationService";
import { ValidationService } from "./ValidationService";
import { AuthenticationService } from "./AuthenticationService";
import { UserManagementService } from "./UserManagementService";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET must be set");

if (!global.__appServices) {
  const validationService = new ValidationService();
  const verificationService = new VerificationService(validationService);
  const authenticationService = new AuthenticationService(
    validationService,
    verificationService
  );
  const userManagementService = new UserManagementService();
  // validationService,
  // authenticationService

  global.__appServices = {
    validationService,
    verificationService,
    authenticationService,
    userManagementService,
  };
}

export const {
  validationService,
  verificationService,
  authenticationService,
  userManagementService,
} = global.__appServices!;
