import assert from "node:assert/strict";
import { test } from "node:test";
import { PDFParse } from "pdf-parse";

process.env.GEMINI_API_KEY ||= "test-key";
const {
  generatePdfFromHtml,
  validateResumeFacts,
  validateResumeClaimReview,
} = await import("../src/services/ai.service.js");
const { createResumeHtml } = await import("../src/utils/resumeHtml.js");

const sourceResume = [
  "Jordan Example",
  "jordan.example@sample.test",
  "+1 555 010 2020",
  "github.com/jordanexample",
  "Frontend developer building accessible React interfaces.",
  "JavaScript, React, Node.js, CSS, REST APIs",
  "BSc Computer Science",
  "Example State University",
  "2021",
  "InterviewPilot",
  "2025",
  "Built an AI interview preparation platform with React and Express.",
  "Frontend Developer",
  "Northwind Apps",
  "2021-2024",
  "Built reusable React components used by internal teams.",
  "Solved 500+ programming practice problems.",
].join("\n");

const sourceDescription =
  "Mentored three beginners in a local coding club; enjoys improving web accessibility.";

const structuredResume = {
  name: "Jordan Example",
  contactDetails: [
    "jordan.example@sample.test",
    "+1 555 010 2020",
    "github.com/jordanexample",
  ],
  professionalSummary: [
    "Frontend developer building accessible React interfaces.",
  ],
  technicalSkills: ["JavaScript", "React", "Node.js", "CSS", "REST APIs"],
  education: [
    {
      title: "BSc Computer Science",
      organization: "Example State University",
      dates: "2021",
      location: "",
      technologies: [],
      links: [],
      bullets: [],
    },
  ],
  projects: [
    {
      title: "InterviewPilot",
      organization: "",
      dates: "2025",
      location: "",
      technologies: ["React", "Express"],
      links: ["github.com/jordanexample"],
      bullets: [
        "Built an AI interview preparation platform with React and Express.",
      ],
    },
  ],
  experience: [
    {
      title: "Frontend Developer",
      organization: "Northwind Apps",
      dates: "2021-2024",
      location: "",
      technologies: [],
      links: [],
      bullets: [
        "Created reusable React components for internal teams.",
      ],
    },
  ],
  achievements: ["Solved more than 500 programming practice problems."],
  certifications: [],
  additionalInformation: [
    "Mentored three beginners at a local coding club and enjoys improving web accessibility.",
  ],
};

test("resume keeps fixed facts source-verifiable while allowing rewritten narrative", () => {
  const verifiedResume = validateResumeFacts(structuredResume, {
    resume: sourceResume,
    selfDescription: sourceDescription,
  });

  assert.equal(verifiedResume.name, "Jordan Example");
  assert.equal(verifiedResume.projects[0].title, "InterviewPilot");
  assert.equal(verifiedResume.projects[0].dates, "2025");
  assert.equal(verifiedResume.experience[0].organization, "Northwind Apps");
  assert.equal(
    verifiedResume.experience[0].bullets[0],
    "Created reusable React components for internal teams.",
  );
  assert.equal(verifiedResume.achievements[0], "Solved more than 500 programming practice problems.");
  assert.throws(
    () =>
      validateResumeFacts(
        {
          ...structuredResume,
          technicalSkills: [...structuredResume.technicalSkills, "Kubernetes"],
        },
        { resume: sourceResume, selfDescription: "" },
      ),
    /could not be verified against the supplied resume or self-description/,
  );
});

test("resume rejects unsupported narrative claims reported by the source reviewer", () => {
  const expectedClaims = [{ index: 0, claim: "Created reusable React components." }];

  assert.doesNotThrow(() =>
    validateResumeClaimReview(
      { claims: [{ index: 0, supported: true }] },
      expectedClaims,
    ),
  );
  assert.throws(
    () =>
      validateResumeClaimReview(
        { claims: [{ index: 0, supported: false }] },
        expectedClaims,
      ),
    /could not be verified as supported/,
  );
  assert.throws(
    () =>
      validateResumeClaimReview(
        { claims: [{ index: 1, supported: true }] },
        expectedClaims,
      ),
    /could not be verified as supported/,
  );
});

test("structured resume PDF preserves source facts and renders a clickable, ATS-readable layout", async () => {
  const verifiedResume = validateResumeFacts(structuredResume, {
    resume: sourceResume,
    selfDescription: sourceDescription,
  });
  const html = createResumeHtml(verifiedResume);

  assert.match(html, /size: A4/);
  assert.match(html, /href="https:\/\/github\.com\/jordanexample"/);
  assert.match(html, /href="mailto:jordan\.example@sample\.test"/);
  assert.match(html, /href="tel:\+15550102020"/);
  assert.match(html, /Technical Skills/);
  assert.match(html, /Projects/);
  assert.match(html, /Experience &amp; Positions of Responsibility/);
  assert.match(html, /Education/);
  assert.match(html, /Achievements/);
  assert.doesNotMatch(html, /-- 1 of 1 --/);

  const pdf = await generatePdfFromHtml(html);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

  const parser = new PDFParse({ data: pdf });
  let extractedText;
  try {
    extractedText = (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }

  for (const sourceFact of [
    "Jordan Example",
    "jordan.example@sample.test",
    "+1 555 010 2020",
    "BSc Computer Science",
    "Example State University",
    "JavaScript",
    "React",
    "InterviewPilot",
    "Northwind Apps",
    "2021-2024",
    "Solved more than 500 programming practice problems.",
    "Mentored three beginners at a local coding club",
  ]) {
    assert.ok(extractedText.includes(sourceFact), `PDF should include "${sourceFact}"`);
  }
  assert.ok(!extractedText.includes("Kubernetes"));
  assert.ok(!extractedText.includes("Google"));
});

test("resume template omits absent identity and contact fields without placeholders", () => {
  const html = createResumeHtml({
    name: "",
    contactDetails: [],
    professionalSummary: [],
    technicalSkills: [],
    education: [],
    projects: [],
    experience: [],
    achievements: [],
    certifications: [],
    additionalInformation: [],
  });

  assert.doesNotMatch(html, /Candidate Name|Your Name|example@|Phone Number/);
  assert.doesNotMatch(html, /<h1>\s*<\/h1>/);
});
