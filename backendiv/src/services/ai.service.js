import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import puppeteer from "puppeteer";
import { createResumeHtml } from "../utils/resumeHtml.js";

import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .describe(
      "A score between 0 and 100 indicating how well the candidate's profile matches the job describe",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .min(5)
    .describe(
      "Technical questions that can be asked in the interview along with their intention and how to answer them",
    ),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .min(5)
    .describe(
      "Behavioral questions that can be asked in the interview along with their intention and how to answer them",
    ),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances",
          ),
      }),
    )
    .describe(
      "List of skill gaps in the candidate's profile along with their severity",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number in the preparation plan, starting from 1"),
        focus: z
          .string()
          .describe(
            "The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc.",
          ),
        tasks: z
          .array(z.string())
          .describe(
            "List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.",
          ),
      }),
    )
    .min(7)
    .describe(
      "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively",
    ),
  title: z
    .string()
    .describe(
      "The title of the job for which the interview report is generated",
    ),
});

const interviewReportResponseSchema = {
  type: Type.OBJECT,
  properties: {
    matchScore: {
      type: Type.NUMBER,
      minimum: 0,
      maximum: 100,
    },
    technicalQuestions: {
      type: Type.ARRAY,
      minItems: "5",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          intention: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "intention", "answer"],
        propertyOrdering: ["question", "intention", "answer"],
      },
    },
    behavioralQuestions: {
      type: Type.ARRAY,
      minItems: "5",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          intention: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "intention", "answer"],
        propertyOrdering: ["question", "intention", "answer"],
      },
    },
    skillGaps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          skill: { type: Type.STRING },
          severity: {
            type: Type.STRING,
            format: "enum",
            enum: ["low", "medium", "high"],
          },
        },
        required: ["skill", "severity"],
        propertyOrdering: ["skill", "severity"],
      },
    },
    preparationPlan: {
      type: Type.ARRAY,
      minItems: "7",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          focus: { type: Type.STRING },
          tasks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["day", "focus", "tasks"],
        propertyOrdering: ["day", "focus", "tasks"],
      },
    },
    title: { type: Type.STRING },
  },
  required: [
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
    "title",
  ],
  propertyOrdering: [
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
    "title",
  ],
};

const resumeEntrySchema = z.object({
  title: z.string().describe("Candidate-provided title or role; keep its factual meaning unchanged, or leave empty if unavailable."),
  organization: z.string().describe("Candidate-provided employer, institution, or organization; do not infer one."),
  dates: z.string().describe("Candidate-provided date text; preserve dates exactly or leave empty if unavailable."),
  location: z.string().describe("Candidate-provided location; do not infer one."),
  technologies: z.array(z.string()).describe("Technologies and skills explicitly present in the candidate-provided sources."),
  links: z.array(z.string()).describe("Candidate-provided URLs, preserved exactly."),
  bullets: z.array(z.string()).describe("Concise professional rewrites of candidate-provided details, preserving their meaning and every factual claim."),
});

const resumeDataSchema = z.object({
  name: z.string().describe("Candidate name exactly as provided in the resume or self-description; empty if unavailable."),
  contactDetails: z.array(z.string()).describe("Candidate-provided contact details, preserving names, addresses, phone numbers, and URLs exactly."),
  professionalSummary: z.array(z.string()).describe("Optional concise professional summary supported by candidate-provided facts; do not add qualifications or claims."),
  technicalSkills: z.array(z.string()).describe("Skills explicitly present in the candidate-provided sources, ordered by relevance to the job description."),
  education: z.array(resumeEntrySchema).describe("Education entries; preserve degrees, institutions, dates, locations, and factual details."),
  projects: z.array(resumeEntrySchema).describe("Projects ordered by job relevance; keep titles, technologies, dates, links, and concise source-supported bullets in separate fields."),
  experience: z.array(resumeEntrySchema).describe("Work experience or positions of responsibility; preserve titles, organizations, dates, locations, and source-supported bullet meaning."),
  achievements: z.array(z.string()).describe("Candidate-provided achievements, which may be concisely rephrased without changing their factual claims."),
  certifications: z.array(z.string()).describe("Certifications explicitly present in the candidate-provided sources."),
  additionalInformation: z.array(z.string()).describe("Other relevant candidate-provided facts not represented elsewhere; do not add new claims."),
});

const resumeEntryResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    organization: { type: Type.STRING },
    dates: { type: Type.STRING },
    location: { type: Type.STRING },
    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
    links: { type: Type.ARRAY, items: { type: Type.STRING } },
    bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "title",
    "organization",
    "dates",
    "location",
    "technologies",
    "links",
    "bullets",
  ],
  propertyOrdering: [
    "title",
    "organization",
    "dates",
    "location",
    "technologies",
    "links",
    "bullets",
  ],
};

const resumeDataResponseSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    contactDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
    professionalSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
    technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    education: { type: Type.ARRAY, items: resumeEntryResponseSchema },
    projects: { type: Type.ARRAY, items: resumeEntryResponseSchema },
    experience: { type: Type.ARRAY, items: resumeEntryResponseSchema },
    achievements: { type: Type.ARRAY, items: { type: Type.STRING } },
    certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
    additionalInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "name",
    "contactDetails",
    "professionalSummary",
    "technicalSkills",
    "education",
    "projects",
    "experience",
    "achievements",
    "certifications",
    "additionalInformation",
  ],
  propertyOrdering: [
    "name",
    "contactDetails",
    "professionalSummary",
    "technicalSkills",
    "education",
    "projects",
    "experience",
    "achievements",
    "certifications",
    "additionalInformation",
  ],
};

const resumeClaimReviewSchema = z.object({
  claims: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      supported: z.boolean(),
    }),
  ),
});

const resumeClaimReviewResponseSchema = {
  type: Type.OBJECT,
  properties: {
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          supported: { type: Type.BOOLEAN },
        },
        required: ["index", "supported"],
        propertyOrdering: ["index", "supported"],
      },
    },
  },
  required: ["claims"],
  propertyOrdering: ["claims"],
};

class ResumeFactValidationError extends Error {}

function normalizeResumeFact(value) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function getResumeNarrativeClaims(resume) {
  return [
    ...resume.professionalSummary,
    ...resume.projects.flatMap((entry) => entry.bullets),
    ...resume.experience.flatMap((entry) => entry.bullets),
    ...resume.education.flatMap((entry) => entry.bullets),
    ...resume.achievements,
    ...resume.additionalInformation,
  ].filter((claim) => claim.trim());
}

function validateResumeFacts(resumeData, { resume, selfDescription }) {
  const parsedResume = resumeDataSchema.parse(resumeData);
  const sourceTexts = [resume, selfDescription]
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalizeResumeFact);
  const fixedFacts = [
    parsedResume.name,
    ...parsedResume.contactDetails,
    ...parsedResume.technicalSkills,
    ...parsedResume.certifications,
    ...parsedResume.education.flatMap((entry) => [
      entry.title,
      entry.organization,
      entry.dates,
      entry.location,
      ...entry.technologies,
      ...entry.links,
    ]),
    ...parsedResume.projects.flatMap((entry) => [
      entry.title,
      entry.organization,
      entry.dates,
      entry.location,
      ...entry.technologies,
      ...entry.links,
    ]),
    ...parsedResume.experience.flatMap((entry) => [
      entry.title,
      entry.organization,
      entry.dates,
      entry.location,
      ...entry.technologies,
      ...entry.links,
    ]),
  ].filter((fact) => fact.trim());

  const unsupportedFact = fixedFacts.find((fact) => {
    const normalizedFact = normalizeResumeFact(fact);
    return !sourceTexts.some((source) => source.includes(normalizedFact));
  });

  if (unsupportedFact) {
    throw new ResumeFactValidationError(
      `Resume output included an identity or qualification detail that could not be verified against the supplied resume or self-description: "${unsupportedFact}"`,
    );
  }

  for (const claim of getResumeNarrativeClaims(parsedResume)) {
    const numericFacts =
      claim.match(/\b\d+(?:[.,]\d+)?%?(?:[-–/]\d{2,4})?\b/g) ?? [];
    for (const fact of numericFacts) {
      const normalizedFact = normalizeResumeFact(fact);
      if (!sourceTexts.some((source) => source.includes(normalizedFact))) {
        throw new ResumeFactValidationError(
          `Resume output included a metric or date that could not be verified against the supplied resume or self-description: "${fact}"`,
        );
      }
    }
  }

  return parsedResume;
}

function validateResumeClaimReview(reviewResponse, expectedClaims) {
  const review = resumeClaimReviewSchema.parse(reviewResponse);
  if (
    review.claims.length !== expectedClaims.length ||
    review.claims.some(
      (result, index) =>
        result.index !== expectedClaims[index].index || !result.supported,
    )
  ) {
    throw new ResumeFactValidationError(
      "Resume output included a rewritten statement that could not be verified as supported by the candidate-provided sources.",
    );
  }
}

async function validateResumeNarrativeClaims(resume, { resume: sourceResume, selfDescription }) {
  const sourceTexts = [sourceResume, selfDescription]
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalizeResumeFact);
  const claims = getResumeNarrativeClaims(resume);
  const claimsToReview = claims
    .map((claim, index) => ({ claim, index }))
    .filter(({ claim }) => {
      const normalizedClaim = normalizeResumeFact(claim);
      return !sourceTexts.some((source) => source.includes(normalizedClaim));
    });

  if (!claimsToReview.length) return;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Assess whether each resume statement below is directly supported by the candidate-provided resume or self-description. Rewording is allowed only when the same meaning and factual claims are supported. Treat a claim as unsupported if it adds responsibility, scope, outcome, skill, seniority, or any other fact not entailed by the source. Do not use outside knowledge or assume that the job description proves a candidate qualification. Return exactly one result for each index, in the same order.\n\nCandidate-provided resume:\n${sourceResume || "(not provided)"}\n\nCandidate-provided self-description:\n${selfDescription || "(not provided)"}\n\nStatements to verify:\n${JSON.stringify(claimsToReview)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: resumeClaimReviewResponseSchema,
    },
  });

  validateResumeClaimReview(JSON.parse(response.text), claimsToReview);
}

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `Generate a complete interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

The JSON response must include:
- At least 5 technicalQuestions, each with a question, intention, and answer.
- At least 5 behavioralQuestions, each with a question, intention, and answer.
- A preparationPlan with at least 7 days, each with a day number, focus, and task list.
- A skillGaps array and a matchScore from 0 to 100.
Do not omit these fields or return empty arrays. Tailor every item to the candidate and job description.`;

  let validationError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        attempt === 0
          ? prompt
          : `${prompt}\nYour previous response was incomplete. Ensure all required arrays contain the requested items.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: interviewReportResponseSchema,
      },
    });

    try {
      return interviewReportSchema.parse(JSON.parse(response.text));
    } catch (error) {
      if (!(error instanceof z.ZodError) && !(error instanceof SyntaxError)) {
        throw error;
      }
      validationError = error;
    }
  }

  throw new Error(
    `Gemini returned an incomplete interview report after retrying: ${validationError.message}`,
  );
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    margin: {
      top: "11mm",
      bottom: "11mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const sourceResume = typeof resume === "string" ? resume.trim() : "";
  const sourceDescription =
    typeof selfDescription === "string" ? selfDescription.trim() : "";
  if (!sourceResume && !sourceDescription) {
    throw new Error("No resume or self-description is available for the PDF.");
  }

  const prompt = `Create a concise, professional, ATS-friendly resume in the required structured JSON format.

Candidate-provided resume text:
${sourceResume || "(not provided)"}

Candidate-provided self-description:
${sourceDescription || "(not provided)"}

Target job description (use only to prioritize source-supported skills and projects):
${jobDescription || "(not provided)"}

Rules:
- Preserve candidate identity, contact details, titles, organizations, education, dates, technologies, skills, and URLs exactly as supplied. Do not complete or infer missing fields.
- You may rewrite or shorten professional summaries and accomplishment bullets for clarity, but preserve their meaning and do not add responsibilities, scope, outcomes, skills, seniority, or other unsupported facts.
- Never use job-description text as evidence that the candidate has a skill, credential, experience, or achievement.
- Do not use interview questions, report content, match scores, or skill-gap analysis.
- Do not invent or normalize names, contact details, dates, organizations, technologies, metrics, titles, or qualifications. Use an empty string or omit an unavailable entry.
- Include relevant factual information from both candidate-provided sources and place it in the matching structured section. Do not append the raw resume or self-description as a block of text.
- Prioritize source-supported skills and projects relevant to the job first without removing other candidate-provided qualifications.
- Return only the JSON object matching the supplied response schema.`;

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents:
        attempt === 0
          ? prompt
          : `${prompt}\nYour previous output failed validation. Return the complete required structure, preserve fixed identity and qualification fields exactly, and ensure rewritten summaries and bullets are fully supported by candidate-provided facts.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeDataResponseSchema,
      },
    });

    try {
      const structuredResume = validateResumeFacts(
        JSON.parse(response.text),
        { resume: sourceResume, selfDescription: sourceDescription },
      );
      await validateResumeNarrativeClaims(structuredResume, {
        resume: sourceResume,
        selfDescription: sourceDescription,
      });
      return generatePdfFromHtml(createResumeHtml(structuredResume));
    } catch (error) {
      if (
        !(error instanceof z.ZodError) &&
        !(error instanceof SyntaxError) &&
        !(error instanceof ResumeFactValidationError)
      ) {
        throw error;
      }
      lastError = error;
    }
  }

  throw new Error(
    `Gemini returned resume content that could not be validated against the supplied sources after retrying: ${lastError.message}`,
  );
}

export {
  generateInterviewReport,
  generateResumePdf,
  generatePdfFromHtml,
  validateResumeFacts,
  validateResumeClaimReview,
};
export default { generateInterviewReport, generateResumePdf, generatePdfFromHtml };
