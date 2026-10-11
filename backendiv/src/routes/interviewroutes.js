import { Router } from "express";
import { asynhandler } from "../utils/asynchandler.js";
import upload from "../middleware/multer.js";
import { authuser } from "../middleware/auth.middleware.js";
import {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
} from "../controller/interview.controller.js";

const router = Router();

router.post(
  "/",
  asynhandler(authuser),
  upload.single("resume"),
  asynhandler(generateInterViewReportController),
);
router.get(
  "/report/:interviewId",
  asynhandler(authuser),
  asynhandler(getInterviewReportByIdController),
);
router.get("/", asynhandler(authuser), asynhandler(getAllInterviewReportsController));
router.post(
  "/resume/pdf/:interviewReportId",
  asynhandler(authuser),
  asynhandler(generateResumePdfController),
);
router.post(
  "/resume/pdf",
  asynhandler(authuser),
  asynhandler(generateResumePdfController),
);

export default router;
