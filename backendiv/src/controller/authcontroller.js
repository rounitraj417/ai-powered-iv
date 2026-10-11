import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import tokenblacklistModel from "../models/blacklist.model.js";
import { APIError } from "../utils/apierror.js";
import { APIResponse } from "../utils/apiresponse.js";

const registeruser = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    throw new APIError(400, "Please provide all the fields");
  }

  const isUserExist = await userModel.findOne({
    $or: [{ username }, { email }],
  });
  if (isUserExist) {
    throw new APIError(400, "User already exists");
      
  }
  const hash = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    username,
    email,
    password: hash,
  });

  return res.status(201).json(
    new APIResponse(
      201,
      {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      "User created successfully",
    ),
  );
};

const loginuser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
  throw new APIError(400, "Please provide all the fields");
  }

  const user = await userModel.findOne({ email });
  if (!user) {
   throw new APIError(400, "User not found");
  }
  const isPasswordMatch = await bcrypt.compare(password, user.password);
  if (!isPasswordMatch) {
     throw new APIError(400, "Invalid password");
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.cookie("token", token);
 return res.status(200).json(
    new APIResponse(200,
        { id: user._id, username: user.username, email: user.email },
        "Login successful")
);
};

 

const logoutuser = async (req, res) => {
  const token = req.cookies?.token;

  if (!token) {
  throw new APIError(400, "Token not found");
  }

  await tokenblacklistModel.create({ token });
  res.clearCookie("token");
 return res.status(200).json(
    new APIResponse(200,
        { message: "Logout successful" },
        "Logout successful")
);
};

const getme = async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    throw new APIError(401, "User not found");
   }
   return res.status(200).json(
    new APIResponse(200,
        { id: user._id, username: user.username, email: user.email },
        "User details fetched successfully")
);
};











  


 


export { registeruser, loginuser, logoutuser,getme };
