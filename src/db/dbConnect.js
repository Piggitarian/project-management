import mongoose from "mongoose";


//connecting db (monogo in this case)
const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB Connected");     
    } catch (error) {
        console.error("MongoDB connection error" , error);
        process.exit(1);
    };
};

// mongoose.connect(process.env.MONGO_URI);

export default connectDB;