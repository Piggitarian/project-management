import {User} from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js";
import {emailVerificationMailgenContent, sendEmail} from "../utils/mail.js"
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Helper: generates a new access + refresh token pair for a user and saves the refresh token to DB
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);   
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})
        return {accessToken , refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something Went wrong while generating access token" , [])
    }
}

// Registers a new user: checks for duplicate username/email, creates the user, generates
// an email verification token, sends the verification email, and returns the created user
const registerUser = asyncHandler(async (req,res)=>{
    const { email , username , password , role}= req.body;
    
    const exsistingUser = await User.findOne({
        $or: [{username} , {email}]
    })

    if(exsistingUser){
        throw new ApiError(409 , "Username or Email already exsists" , []);
    }

    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified : false
    });

    const {unHasedToken , Hashedtoken , tokenExpiry} = 
        user.generateTemporaryToken();

    user.emailVerificationToken = Hashedtoken;
    user.emailVerificationExpiry= tokenExpiry;

    await user.save({validateBeforeSave : false})

    await sendEmail(
        {
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHasedToken}`
            ),

        });
        
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry   "
        );

        if(!createdUser){
            throw new ApiError(500 , "something went wrong ")
        }
        
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

// Logs a user in: validates email, checks password, issues access + refresh tokens as
// cookies and in the response body
const login =   asyncHandler(async (req , res ) => {
    const {email , password , username } = req.body

    if(!email){
        throw new ApiError(400 , "username or email is required");
    }

    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(400 , "user does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400 , "password or username is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry   "
    );

    const options = {
        httpOnly : true,
        secure : true
    }

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

// Logs a user out: clears their stored refresh token in DB and clears auth cookies
const logoutUser  = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        },
    );  
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken" , options )
        .clearCookie("refreshToken" , options )
        .json(new ApiResponse(200, {} , "User logged Out"));    
});

// Returns the currently authenticated user (from req.user, set by verifyJWT middleware)
const getCurentUser = asyncHandler(async (req, res) => {
        return  res.status(200).json(
            new ApiResponse(
                200,
                req.user,
                "Current User fetched Successully"
            )
        )
});

// Verifies a user's email using the token from the URL: hashes it, matches against DB,
// checks expiry, and marks the user as verified
const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params

    if(!verificationToken){
        throw new ApiError(400 , "Email verification token is missing");
    }

    let hashedToken = crypto
                        .createHash("sha256")
                        .update(verificationToken)
                        .digest("hex");
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: {$gt: Date.now()},
    })

    if(!user){
        throw new ApiError(400 , "token is invalid or expired");
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    user.isEmailVerified = true
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isEmailVerified : true
                },
                "Email is Verfied all ok full ok"
            )
        )
});

const resendEmailverification = asyncHandler(async (req , res) => {
    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(404 , "user  does not exist")
    }

    if(user.isEmailVerified){
        throw new ApiError(409 , "email is already verified")
    }

    const { unHasedToken , hashedToken , tokenExpiry} = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false});

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
export {registerUser , login , logoutUser , getCurentUser , verifyEmail}