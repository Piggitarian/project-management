import {User} from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js"
import { asyncHandler } from "../utils/async-handler.js";
import {emailVerificationMailgenContent, sendEmail} from "../utils/mail.js"
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // Fetch user to attach tokens to
        const user = await User.findById(userId);   
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refresh token to DB without triggering validation errors
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})
        return {accessToken , refreshToken}
    } catch (error) {
        throw new ApiError(500,"Something Went wrong while generating access token" , [])
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    // 1. Extract raw data from the request body
    const { email , username , password , role}= req.body;
    
    // 2. Check if username or email is already taken
    const exsistingUser = await User.findOne({
        $or: [{username} , {email}]
    })

    if(exsistingUser){
        throw new ApiError(409 , "Username or Email already exsists" , []);
    }

    // 3. Create user in DB (password hashes automatically via schema hook)
    const user = await User.create({
        email,
        password,
        username,
        isEmailVerified : false
    });

    // 4. Generate email verification token and save it to the user doc
    const {unHasedToken , Hashedtoken , tokenExpiry} = 
        user.generateTemporaryToken();

    user.emailVerificationToken = Hashedtoken;
    user.emailVerificationExpiry= tokenExpiry;

    await user.save({validateBeforeSave : false})

    // 5. Fire off the verification email via Mailtrap
    await sendEmail(
        {
            email: user?.email,
            subject: "Please verify your email",
            mailgenContent: emailVerificationMailgenContent(
                user.username,
                `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHasedToken}`
            ),

        });
        
        // 6. Fetch the newly created user (excluding sensitive data) to send back
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry   "
        );

        if(!createdUser){
            throw new ApiError(500 , "something went wrong ")
        }
        
        // 7. Send the final success response to the frontend
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
})


export {registerUser , login , logoutUser }