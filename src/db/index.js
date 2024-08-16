import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb=async()=>{
    
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`mongo db connnected !! DB HOST:${connectionInstance.connection.host}`)
        //connection.host
    } catch (error) {
        console.log("MongoDB connection error",error)
        process.exit(1)
        
    }
}
export default connectDb