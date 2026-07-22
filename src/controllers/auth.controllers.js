import {User} from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js";
import {emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail} from "../utils/mail.js"
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ============================================================================
// Helper: Generate Tokens
// ============================================================================
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // 1. Fetch user by ID
        const user = await User.findById(userId);   
        
        // 2. Trigger the schema methods to sign the JWTs
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // 3. Attach the new refresh token to the user document
        user.refreshToken = refreshToken;
        
        // 4. Save to DB. validateBeforeSave is false because we don't want to trigger 
        // full schema validation (like checking for passwords) just to update a token.
        await user.save({validateBeforeSave: false})
        
        return {accessToken , refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something Went wrong while generating access token" , [])
    }
}

// ============================================================================
// Controller: Register User
// ============================================================================
const registerUser = asyncHandler(async (req,res)=>{
    // 1. Extract raw data from the request body
    const { email , username , password , role}= req.body;
    
    // 2. Database check: Ensure username or email isn't already taken
    const exsistingUser = await User.findOne({
        $or: [{username} , {email}]
    })

    if(exsistingUser){
        throw new ApiError(409 , "Username or Email already exsists" , []);
    }

    // 3. Create the user in the database (Mongoose pre-save hook handles password hashing)
    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified : false
    });

    // 4. Generate a secure crypto token for email verification
    const {unHasedToken , hashedToken , tokenExpiry} = user.generateTemporaryToken();

    // 5. Save the hashed version to the DB for later comparison
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry= tokenExpiry;
    await user.save({validateBeforeSave : false})

    // 6. Fire off the actual email using Mailtrap/Nodemailer containing the UNHASHED token in the URL
    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHasedToken}`
        ),
    });
        
    // 7. Fetch the created user, explicitly stripping out sensitive tokens and passwords
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry   "
    );

    if(!createdUser){
        throw new ApiError(500 , "something went wrong ")
    }
    
    // 8. Return success response to the client
    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                {user: createdUser},
                "User resgistered full ok all ok and email has been sent ur email"
            )
        )
});

// ============================================================================
// Controller: Login
// ============================================================================
const login = asyncHandler(async (req , res ) => {
    // 1. Grab credentials
    const {email , password , username } = req.body

    if(!email){
        throw new ApiError(400 , "username or email is required");
    }

    // 2. Find the user by email
    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(400 , "user does not exists");
    }

    // 3. Use the schema method to compare the raw password with the hashed password in the DB
    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400 , "password or username is incorrect")
    }

    // 4. Generate fresh access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    // 5. Fetch user data to send back to the frontend (stripping sensitive info)
    const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry   "
    );

    // 6. Define strict cookie settings (httpOnly prevents XSS attacks)
    const options = {
        httpOnly : true,
        secure : true
    }

    // 7. Send response, attaching the tokens to both the cookies AND the JSON body
    return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , refreshToken , options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
});

// ============================================================================
// Controller: Logout
// ============================================================================
const logoutUser  = asyncHandler(async (req, res) => {
    // 1. Find the user by ID (injected by verifyJWT middleware) and clear their refresh token in the DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true // Returns the updated document
        },
    );  

    const options = {
        httpOnly: true,
        secure: true
    }

    // 2. Clear the cookies from the user's browser and return success
    return res
        .status(200)
        .clearCookie("accessToken" , options )
        .clearCookie("refreshToken" , options )
        .json(new ApiResponse(200, {} , "User logged Out"));    
});

// ============================================================================
// Controller: Get Current User
// ============================================================================
const getCurentUser = asyncHandler(async (req, res) => {
    // Because this route uses verifyJWT middleware, req.user is already validated and safe to return directly
    return  res.status(200).json(
        new ApiResponse(
            200,
            req.user,
            "Current User fetched Successully"
        )
    )
});

// ============================================================================
// Controller: Verify Email
// ============================================================================
const verifyEmail = asyncHandler(async (req, res) => {
    // 1. Extract the raw token from the URL parameters
    const { verificationToken } = req.params

    if(!verificationToken){
        throw new ApiError(400 , "Email verification token is missing");
    }

    // 2. Hash the incoming token so we can compare it to the securely hashed version in the DB
    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    // 3. Search DB for a user with this exact hashed token AND check if it hasn't expired yet
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: {$gt: Date.now()}, // $gt = greater than current time
    })

    if(!user){
        throw new ApiError(400 , "token is invalid or expired");
    }

    // 4. Token is valid! Wipe the verification fields from the document to prevent reuse
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    
    // 5. Flag the user as verified and save
    user.isEmailVerified = true
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isEmailVerified : true },
                "Email is Verfied all ok full ok"
            )
        )
});

// ============================================================================
// Controller: Resend Email Verification
// ============================================================================
const resendEmailverification = asyncHandler(async (req , res) => {
    // 1. Find the logged-in user
    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(404 , "user  does not exist")
    }

    // 2. Prevent spamming if they are already verified
    if(user.isEmailVerified){
        throw new ApiError(409 , "email is already verified")
    }

    // 3. Generate a brand new token and expiry time
    const { unHasedToken , hashedToken , tokenExpiry} = user.generateTemporaryToken();

    // 4. Overwrite the old token data in the database
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false});

    // 5. Fire off the new email
    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHasedToken}`,
        ),
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Mail has been sent to your email-ID"
            )
        )
});

// ============================================================================
// Controller: Refresh Access Token
// ============================================================================
const refreshAccessToken = asyncHandler(async (req , res) => {
    // 1. Grab the refresh token from either cookies or the request body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401 , "unauthoriezed access");
    }

    try {
        // 2. Validate the token against your secret key
        const decodedToken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
        
        // 3. Find the user associated with this token's payload (_id)
        const user = await User.findById(decodedToken?._id)

        // 4. Ensure the incoming token matches the one currently saved in the database (prevents stolen token reuse)
        if(incomingRefreshToken != user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is Expired");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        // 5. Generate a brand new Access AND Refresh token pair (Refresh Token Rotation logic)
        const {accessToken , refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        // 6. Save the new refresh token to the DB
        user.refreshToken = newRefreshToken;
        await user.save({validateBeforeSave: false}) // Note: Added validateBeforeSave: false here to prevent validation crashes
        
        // 7. Send the new tokens back to the client
        return res
            .status(200)
            .cookie("accessToken", accessToken ,options)
            .cookie("refreshToken", newRefreshToken ,options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken , refreshToken: newRefreshToken},
                    "access token refresh"
                )
            )
    
    } catch (error) {
        throw new ApiError(401 , "Invalid refresh token");
    }
});

// ============================================================================
// Controller: Forgot Password Request
// ============================================================================
const forgotPasswordRequest = asyncHandler( async (req ,res) => {
    const {email} = req.body

    // 1. Check if the email exists in the system
    const user = await User.findOne({email})
    if(!user){
        throw new ApiError(404 , "user does not exists" , []);
    }

    // 2. Generate a crypto token for password resetting
    const { unHasedToken , hashedToken , tokenExpiry } = user.generateTemporaryToken();

    // 3. Save the hashed token to the DB
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save({validateBeforeSave: true}) // validateBeforeSave is true here; ensure this doesn't break if required fields are missing in memory

    // 4. Send the reset link via email
    await sendEmail({
        email: user?.email,
        subject:"Password Reset",
        mailgenContent: forgotPasswordMailgenContent
        (
            user.username,
           `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHasedToken}`,
        ),
    });
    
    return  res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset mail has been sent on your mail id"
            )
        )
});

// ============================================================================
// Controller: Reset Forgot Password
// ============================================================================
const resetForgotPassword  = asyncHandler(async (req , res) => {
    // 1. Extract the token from the URL and the new password from the body
    const {resetToken} = req.params
    const {newPassword} = req.body

    // 2. Hash the URL token so it matches the DB format
    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")
    
    // 3. Verify the token exists and hasn't expired
    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {$gt: Date.now()},
    });

    if(!user){
        throw new ApiError(489 , "token invalid or expired")
    }

    // 4. Wipe the reset tokens from the DB to prevent reuse
    user.forgotPasswordExpiry = undefined
    user.forgotPasswordToken = undefined

    // 5. Update the password (the Mongoose pre-save hook will hash this new password automatically)
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "password reseted successfully"
            )
        )
});

// ============================================================================
// Controller: Change Current Password (While Logged In)
// ============================================================================
const changeCurrentPassword  = asyncHandler(async (req , res) => {
    const {oldPassword , newPassword} = req.body

    // 1. Find the currently logged-in user
    const user = await User.findById(req.user?._id);

    // 2. Verify their old password is correct before allowing a change
    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    
    if(!isPasswordValid){
        throw new ApiError(400 , "Invalid old Password")
    }

    // 3. Set the new password (again, Mongoose pre-save hook hashes it automatically)
    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password Changed Successfully"
            )
        )
});

export {
    registerUser,
    login,
    logoutUser,
    getCurentUser,
    verifyEmail,
    resendEmailverification,
    refreshAccessToken,
    forgotPasswordRequest,
    resetForgotPassword,
    changeCurrentPassword
}