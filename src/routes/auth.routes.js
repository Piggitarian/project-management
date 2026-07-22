import { Router } from "express";
import { changeCurrentPassword, forgotPasswordRequest, getCurentUser, logoutUser, refreshAccessToken, registerUser, resendEmailverification, resetForgotPassword, verifyEmail } from "../controllers/auth.controllers.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userResgisterValidator , userLoginValidator, userChangeCurrentPassowrdValidator, userForgotPasswordValidator, userResetForgotValidators } from "../validators/indexVal.js";
import { login } from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

// ============================================================================
// UNSECURE ROUTES (No JWT required - open to the public)
// ============================================================================

// 1. Register: Runs validation rules -> checks for validation errors -> creates user
router.route("/register").post(userResgisterValidator() ,validate ,  registerUser);

// 2. Login: Runs login validation rules -> checks for errors -> issues tokens
router.route("/login").post(userLoginValidator(), validate , login);

// 3. Verify Email: GET request because the user is clicking a link from their email inbox
router.route("/verify-email/:verificationToken").get( verifyEmail );

// 4. Refresh Token: Uses the refresh token in cookies/body to issue a new access token
router.route("/refresh-token").post( refreshAccessToken );

// 5. Forgot Password: Validates the email format -> sends the reset link
router.route("/forgot-password").post(userForgotPasswordValidator(), validate , forgotPasswordRequest );

// 6. Reset Password: Takes the new password, validates it -> updates the DB using the URL token
router.route("/reset-password/:resetToken").post(userResetForgotValidators() ,validate, resetForgotPassword);


// ============================================================================
// SECURE ROUTES (User MUST be logged in / verifyJWT middleware runs first)
// ============================================================================

// 1. Logout: Checks JWT -> clears cookies and DB refresh token
router.route("/logout").post(verifyJWT ,logoutUser);

// 2. Current User: Checks JWT -> returns the user object (Consider changing .post to .get)
router.route("/current-user").post(verifyJWT ,getCurentUser);

// 3. Change Password: Checks JWT -> validates new/old password inputs -> updates DB
router.route("/change-password").post(verifyJWT ,userChangeCurrentPassowrdValidator() ,validate , changeCurrentPassword)    ;

// 4. Resend Verification: Checks JWT (to know who is requesting it) -> emails a fresh token
router.route("/resend-email-verification").post(verifyJWT , resendEmailverification);


export default router;