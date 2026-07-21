import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    //  Extract the token from either the user's cookies OR the Authorization header.
    //(I check the header too, so mobile apps or Postman can send the token as a Bearer token)
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    // If no token is found in either location, instantly reject the request
    if (!token) {
        throw new ApiError(401, "Unauthorized Request"); // Note: Swapped 404 to 401 (Unauthorized) as it is the standard for auth errors
    }

    try {
        //Decrypt the token using your secret key to reveal the payload (which contains the _id)
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
       
        // Search the database for the user using that decoded _id. 
        // We strip out the password and other tokens so they don't accidentally leak.
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
        );
    
        //If the token was valid but the user was deleted from the database, reject it
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        
        // Attach the entire user object to the request 
        // Now, any route that uses this middleware can simply call `req.user` to get the logged-in user's details
        req.user = user;
        
        //Pass control to the next middleware or the actual route controller
        next();
        
    } catch (error) {
        // If jwt.verify fails (the token is expired or was tampered with) catch the error here
        throw new ApiError(401, "Invalid access token");
    }
});


