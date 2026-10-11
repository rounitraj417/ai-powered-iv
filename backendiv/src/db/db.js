import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conection = await mongoose.connect(process.env.MONGO_URI);
         
console.log(`MongoDB Connected: ${conection.connection.host}`);
    }
    catch (err) {
        console.error("mongodb connection error", err);
        throw err;
    }

}
export default connectDB;