import { PDFParse } from "pdf-parse";
import interviewReportModel from "../models/interviewReport.model.js";
import {
  generateInterviewReport,
  generateResumePdf,
} from "../services/ai.service.js";
import { APIError } from "../utils/apierror.js";

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
  const { selfDescription, jobDescription } = req.body;

  if (!jobDescription?.trim()) {
    throw new APIError(400, "Job description is required.");
  }

  if (!req.file?.buffer && !selfDescription?.trim()) {
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

  const interViewReportByAi = await generateInterviewReport({
    resume: resumeContent,
    selfDescription,
    jobDescription,
  });
  const generatedTitle =
    typeof interViewReportByAi.title === "string"
      ? interViewReportByAi.title.trim()
      : "";
  const fallbackTitle =
    jobDescription
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.replace(/^(job title|position|role)\s*:\s*/i, "")
      .slice(0, 120) || "Interview Plan";

  const interviewReport = await interviewReportModel.create({
    user: req.user.id,
    resume: resumeContent,
    selfDescription,
    jobDescription,
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

  if (!req.user?.id) {
    throw new APIError(401, "Authentication required.");
  }

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: req.user.id,
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
  if (!req.user?.id) {
    throw new APIError(401, "Authentication required.");
  }

  const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
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
  const { interviewReportId } = req.params;

  if (!interviewReportId && req.body?.interviewReportId) {
    req.params.interviewReportId = req.body.interviewReportId;
  }

  const reportIdToFetch = req.params.interviewReportId;
  if (!reportIdToFetch) {
    throw new APIError(400, "Interview report id is required.");
  }

  const interviewReport = await interviewReportModel.findById(reportIdToFetch);

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  const { resume, jobDescription, selfDescription } = interviewReport;

  const pdfBuffer = await generateResumePdf({
    resume,
    jobDescription,
    selfDescription,
  });

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