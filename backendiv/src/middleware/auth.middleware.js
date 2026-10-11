import jwt from "jsonwebtoken";
import tokenblacklistModel from "../models/blacklist.model.js";
import { APIError } from "../utils/apierror.js";

const authuser = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    throw new APIError(401, "Token not found");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        error.name,
      )
    ) {
      throw new APIError(401, "Invalid or expired token");
    }
    throw error;
  }

  const isTokenBlacklisted = await tokenblacklistModel.findOne({ token });
  if (isTokenBlacklisted) {
    throw new APIError(401, "Token blacklisted");
  }

  req.user = decoded;
  next();
};

export { authuser };
