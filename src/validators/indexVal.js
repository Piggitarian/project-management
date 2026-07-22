import { body } from "express-validator"

// ============================================================================
// Validator: Register User
// ============================================================================
const userResgisterValidator = () => {
    return [
        // 1. Email: Strip whitespace, ensure it's not empty, and verify it's a valid email format
        body("email")
            .trim()
            .notEmpty()
            .withMessage("email is required")
            .isEmail()
            .withMessage("email is invalid"),
        
        // 2. Username: Strip whitespace, ensure it's provided, force lowercase, and restrict length
        body("username")
            .trim()
            .notEmpty()
            .withMessage("username req")
            .isLowercase()
            .withMessage("username must be in lowercase!!")
            .isLength({ min: 3, max: 20 })    
            .withMessage("Username must be between 3 and 20 characters"),
                    
        // 3. Password: Strip whitespace and ensure the user actually typed something
        body("password")
            .trim()
            .notEmpty().withMessage("password cant be empty"),

        // 4. Full Name (Optional): If the user provides it, ensure it isn't just empty spaces
        body("fullName")
            .optional()
            .trim()
            .notEmpty().withMessage("Can't be empty")
    ]
}

// ============================================================================
// Validator: Login User
// ============================================================================
const userLoginValidator = () => {
    return [
        // 1. Email (Optional): If provided, it must be a valid email string
        // (Note: Making this optional is good if you plan to allow logging in with a username later)
        body("email")
            .optional()
            .isEmail()
            .withMessage("email is invalid"),
        
        // 2. Password: Must exist in the request body
        body("password")
            .notEmpty()
            .withMessage("cant be empty")
    ]
}

// ============================================================================
// Validator: Change Current Password
// ============================================================================
const userChangeCurrentPassowrdValidator = () => {
    return [
        // 1. Old Password: Required to verify the user's identity before allowing a change
        body("oldPassword")
            .notEmpty()
            .withMessage("Old Password is Required"),
        
        // 2. New Password: Required field 
        body("newPassword")
            .notEmpty()
            .withMessage("cant be empty")
    ]
}

// ============================================================================
// Validator: Forgot Password Request
// ============================================================================
const userForgotPasswordValidator = () => {
    return [
        // 1. Email: Required to know where to send the password reset link
        body("email")
            .notEmpty()
            .withMessage("can't be empty")
            .isEmail()
            .withMessage("email is invalid")
    ]
}

// ============================================================================
// Validator: Reset Forgot Password
// ============================================================================
const userResetForgotValidators = () => {
    return [
        // 1. New Password: Required to set the new credentials after clicking the email link
        body("newPassword")
            .trim()
            .notEmpty()
            .withMessage("cant be empty")
    ]
}    

export{
    userResgisterValidator , 
    userLoginValidator,
    userChangeCurrentPassowrdValidator,
    userForgotPasswordValidator,
    userResetForgotValidators
}