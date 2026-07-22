import { Router } from "express";
import { changeCurrentPassword, forgotPasswordRequest, getCurentUser, logoutUser, refreshAccessToken, registerUser, resendEmailverification, resetForgotPassword, verifyEmail } from "../controllers/auth.controllers.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userResgisterValidator , userLoginValidator, userChangeCurrentPassowrdValidator, userForgotPasswordValidator, userResetForgotValidators } from "../validators/indexVal.js";
import { login } from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();
// unsecure route
router.route("/register").post(userResgisterValidator() ,validate ,  registerUser);
router.route("/login").post(userLoginValidator(), validate , login);
router.route("/verify-email/:verificationToken").get( verifyEmail );
router.route("/refresh-token").post( refreshAccessToken );
router.route("/forgot-password").post(userForgotPasswordValidator(), validate , forgotPasswordRequest );
router.route("/reset-password/:resetToken").post(userResetForgotValidators() ,validate, resetForgotPassword);

// secure route
router.route("/logout").post(verifyJWT ,logoutUser);
router.route("/current-user").post(verifyJWT ,getCurentUser);
router.route("/change-password").post(verifyJWT ,userChangeCurrentPassowrdValidator() ,validate , changeCurrentPassword)    ;
router.route("/resend-email-verification").post(verifyJWT , resendEmailverification);


export default router;