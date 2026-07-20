import { Router } from "express";
import { registerUser } from "../controllers/auth.controllers.js"
import { validate } from "../middlewares/validator.middleware.js";
import { userResgisterValidator } from "../validators/indexVal.js";
import { login } from "../controllers/auth.controllers.js";
const router = Router();

router.route("/register").post(userResgisterValidator() ,validate ,  registerUser);
router.route("/login").post(userLoginValidator(), validate , login);


export default router;