import mongoose , {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"

const userSchema = new Schema(
    {
        avatar: {
            type:{
                url : String,
                localPath: String
            },
            default : {
                url: `https://placehold.co/400`,
                localPath: ""
            }
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim : true,
            index: true
        },
        email: {
            type:String,
            required:true,
            unique: true,
            lowercase:true,
            trim:true
        },
        fullName:{
            type:String,
            trim: true
        },
        password : {
            type : String,
            required : [true , "Password is Required"], 
        },
        isEmailVerified: {
            type : Boolean,
            default : false,
        },
        refreshToken: {
            type: String,
        },
        forgotPasswordToken:{
            type: String,
        },
        forgotPasswordExpiry:{
            type : Date
        },
        emailVerificationToken:{
            type: String
        },
        emailVerificationExpiry:{
            type : Date
        },
    },{
        timestamps: true
    }
);

userSchema.pre("save" , async function(){
    //"password" so it only triggers on password changes
    if(!this.isModified("password")) return;
    
    //Hash the password
    this.password = await bcrypt.hash(this.password, 10);
    
    // No next() needed, Mongoose automatically moves on when the async function finishes.
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
};


// accessToken GEN

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn : process.env.ACCESS_TOKEN_EXPIRY}
    )
}

//refresh token gen
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn : process.env.REFRESH_TOKEN_EXPIRY}
    )
}

//temp token using crypto 
userSchema.methods.generateTemporaryToken = function(){
        const unHasedToken =  crypto.randomBytes(20).toString("hex")
        const Hashedtoken = crypto
                                .createHash("sha256")
                                .update(unHasedToken)
                                .digest("hex")

        const tokenExpiry = Date.now() + (20*60*1000) //20mins

        return {unHasedToken , Hashedtoken , tokenExpiry}
    }

export const User = mongoose.model("User" , userSchema);    