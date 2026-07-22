import { body } from "express-validator"



const userResgisterValidator = () => {
    return [
        body("email")
                .trim()
                .notEmpty()
                .withMessage("email is required")
                .isEmail()
                .withMessage("email is invalid"),
        
        body("username")
                .trim()
                .notEmpty()
                .withMessage("username req")
                .isLowercase()
                .withMessage("username must be in lowercase!!")
                .isLength({ min: 3, max: 20 })    
                .withMessage("Username must be between 3 and 20 characters")
                .withMessage("username cant be longer than 20 Characters"),
        
        body("password")
                .trim()
                .notEmpty().withMessage("password cant be empty"),

        body("fullName")
                .optional()
                .trim()
                .notEmpty().withMessage("Can't be empty")

    ]
}

const userLoginValidator = () => {
        return [
                body("email")
                        .optional()
                        .isEmail()
                        .withMessage("email is invalid"),
                body("password")
                                .notEmpty()
                                .withMessage("cant be empty")
        ]
}

const userChangeCurrentPassowrdValidator = () => {
        return [
                body("oldPassword")
                        .notEmpty()
                        .withMessage("Old Password is Required"),
                body("newpassword")
                                .notEmpty()
                                .withMessage("cant be empty")
        ]
}

const userForgotPasswordValidator = () => {
        return [
                body("email")
                        .notEmpty
                        .withMessage("can't be empty")
                        .isEmail()
                        .withMessage("email is invalid"),
                body("password")
                                .notEmpty()
                                .withMessage("cant be empty")
        ]
}
export{
    userResgisterValidator , 
    userLoginValidator,
    userChangeCurrentPassowrdValidator
}