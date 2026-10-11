import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: [true, "Username already exists"],
    },
    email: {
        type: String,
        unique: [true, "Email already exists"],
        required:true
    },
    password: {
        type: String,
        required: true
    },


});

const userModel = mongoose.model("user", userSchema);

export default userModel;