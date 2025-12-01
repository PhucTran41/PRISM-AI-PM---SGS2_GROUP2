import { ValidationService } from "../services/user/ValidationService";
import { VerificationService } from "../services/user/VerificationService";
import { AuthenticationService } from "../services/user/AuthenticationService";
import { UserManagementService } from "../services/user/UserManagementService";

declare global {
  interface AppServices {
    validationService: ValidationService;
    verificationService: VerificationService;
    authenticationService: AuthenticationService;
    userManagementService: UserManagementService;
  }

  var __appServices: AppServices | undefined;
}

export {};
