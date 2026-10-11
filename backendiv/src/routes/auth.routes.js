import { Router } from "express";
import {
  registeruser,
  loginuser,
  logoutuser,
  getme,
} from "../controller/authcontroller.js";
import { asynhandler } from "../utils/asynchandler.js";
import { authuser } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", asynhandler(registeruser));
router.post("/login", asynhandler(loginuser));
router.post("/logout", asynhandler(logoutuser));
router.get("/get-me", asynhandler(authuser), asynhandler(getme));

export default router;
