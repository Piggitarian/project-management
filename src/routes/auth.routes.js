import { Router } from "express";
import { logoutUser, registerUser } from "../controllers/auth.controllers.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userResgisterValidator  , userLoginValidator } from "../validators/indexVal.js";
import { login } from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.route("/register").post(userResgisterValidator() ,validate ,  registerUser);
router.route("/login").post(userLoginValidator(), validate , login);
router.route("/logout").post(verifyJWT ,logoutUser);


export default router;