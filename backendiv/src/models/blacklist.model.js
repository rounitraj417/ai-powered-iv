import mongoose from "mongoose";

 
const blacklisttokenSchema = new mongoose.Schema({
     token: {
        type: String,
        required: [true, "Token is required"]
    },

}, {
    timestamps: true
}
);


const tokenblacklistModel = mongoose.model("tokenblacklist", blacklisttokenSchema);

export default tokenblacklistModel;