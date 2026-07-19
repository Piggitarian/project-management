import dotenv from 'dotenv';
import app from "./app.js"
import connectDB from './db/dbConnect.js';
//env
dotenv.config({
    path: "./.env",
});

//express

const port = process.env.PORT || 6769;

connectDB()
    .then(()=>{
        app.listen(port ,()=>{
            console.log(`listening to port : ${port}`);
        });
    })
    .catch((err) => {
        console.error("MonogoDb connection error" , error);
        process.exit(1);
    })