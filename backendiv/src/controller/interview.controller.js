import { PDFParse } from "pdf-parse";
import interviewReportModel from "../models/interviewReport.model.js";
import {
  generateInterviewReport,
  generateResumePdf,
} from "../services/ai.service.js";
import { APIError } from "../utils/apierror.js";

function getAuthenticatedUserId(req) {
  if (!req.user?.id) {
    throw new APIError(401, "Authentication required.");
  }

  return req.user.id;
}

function isValidInterviewReportId(id) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
  const userId = getAuthenticatedUserId(req);
  const { selfDescription, jobDescription } = req.body ?? {};

  if (typeof jobDescription !== "string" || !jobDescription.trim()) {
    throw new APIError(400, "Job description is required.");
  }

  if (
    selfDescription !== undefined &&
    typeof selfDescription !== "string"
  ) {
    throw new APIError(400, "Self-description must be text.");
  }

  const normalizedSelfDescription = selfDescription?.trim() ?? "";
  if (!req.file?.buffer && !normalizedSelfDescription) {
    throw new APIError(
      400,
      "Upload a resume or provide a self-description.",
    );
  }

  let resumeContent = "";
  if (req.file?.buffer) {
    const parser = new PDFParse({ data: req.file.buffer });
    try {
      const parsedResume = await parser.getText();
      resumeContent = parsedResume.text || "";
    } finally {
      await parser.destroy();
    }
  }

  let interViewReportByAi;
  try {
    interViewReportByAi = await generateInterviewReport({
      resume: resumeContent,
      selfDescription: normalizedSelfDescription,
      jobDescription: jobDescription.trim(),
    });
  } catch (error) {
    console.error("Gemini interview report generation failed:", error.message);
    throw new APIError(
      502,
      "Interview report generation failed. Please try again later.",
    );
  }

  const generatedTitle =
    typeof interViewReportByAi.title === "string"
      ? interViewReportByAi.title.trim()
      : "";
  const fallbackTitle =
    jobDescription.trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.replace(/^(job title|position|role)\s*:\s*/i, "")
      .slice(0, 120) || "Interview Plan";

  const interviewReport = await interviewReportModel.create({
    user: userId,
    resume: resumeContent,
    selfDescription: normalizedSelfDescription,
    jobDescription: jobDescription.trim(),
    ...interViewReportByAi,
    title: generatedTitle || fallbackTitle,
  });

  res.status(201).json({
    message: "Interview report generated successfully.",
    interviewReport,
  });
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
  const { interviewId } = req.params;
  const userId = getAuthenticatedUserId(req);
  if (!isValidInterviewReportId(interviewId)) {
    throw new APIError(400, "Invalid interview report id.");
  }

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: userId,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  res.status(200).json({
    message: "Interview report fetched successfully.",
    interviewReport,
  });
}

/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
  const userId = getAuthenticatedUserId(req);

  const interviewReports = await interviewReportModel
    .find({ user: userId })
    .sort({ createdAt: -1 })
    .select(
      "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan",
    );

  res.status(200).json({
    message: "Interview reports fetched successfully.",
    interviewReports,
  });
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
  const userId = getAuthenticatedUserId(req);
  const reportIdToFetch =
    req.params.interviewReportId ?? req.body?.interviewReportId;
  if (!reportIdToFetch) {
    throw new APIError(400, "Interview report id is required.");
  }
  if (!isValidInterviewReportId(reportIdToFetch)) {
    throw new APIError(400, "Invalid interview report id.");
  }

  const interviewReport = await interviewReportModel.findOne({
    _id: reportIdToFetch,
    user: userId,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  const { resume, jobDescription, selfDescription } = interviewReport;

  let pdfBuffer;
  try {
    pdfBuffer = await generateResumePdf({
      resume,
      jobDescription,
      selfDescription,
    });
  } catch (error) {
    console.error("Gemini resume generation failed:", error.message);
    throw new APIError(
      502,
      "Resume generation failed. Please try again later.",
    );
  }

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume_${reportIdToFetch}.pdf`,
  });

  res.send(pdfBuffer);
}

export {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
};

export default {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
};