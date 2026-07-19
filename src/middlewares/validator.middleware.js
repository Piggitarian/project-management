import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";



export const validate = (req , res , next)=> {
     const errors = validationResult(req);

     //checking if there is an error
     if(errors.isEmpty()){
        //if no error
        return next()
     }

     //putting the errors in one array
     const extractedErrors = []
     errors.array().map((err)=> extractedErrors.push(
        {
            [err.path]: err.msg 
        }
        ));
        
        //throwing the error
        throw new ApiError(422, "recived data is not valid" , extractedErrors);
    }

