function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTextWithLinks(value) {
  const urlPattern =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:https?:\/\/|www\.)[^\s<]+|(?:github|linkedin)\.com\/[^\s<]+/gi;
  let result = "";
  let lastIndex = 0;

  for (const match of value.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const isEmail = rawUrl.includes("@");
    const trailingPunctuation = rawUrl.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
    const url = rawUrl.slice(0, rawUrl.length - trailingPunctuation.length);
    const href = isEmail
      ? `mailto:${url}`
      : /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;

    result += escapeHtml(value.slice(lastIndex, match.index));
    result += `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>${escapeHtml(trailingPunctuation)}`;
    lastIndex = match.index + rawUrl.length;
  }

  return result + escapeHtml(value.slice(lastIndex));
}

function renderContactDetail(value) {
  const phoneMatch = value.match(/(?:^|:\s*)(\+?[\d][\d\s().-]{5,}\d)$/);
  if (!phoneMatch) return renderTextWithLinks(value);

  const phone = phoneMatch[1];
  const phoneStart = value.length - phone.length;
  const phoneHref = phone.replace(/[^\d+]/g, "");
  return `${renderTextWithLinks(value.slice(0, phoneStart))}<a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(phone)}</a>`;
}

function renderSection(heading, content) {
  if (!content) return "";
  return `<section class="resume-section">
    <h2>${escapeHtml(heading)}</h2>
    ${content}
  </section>`;
}

function renderParagraphs(items) {
  return items
    .filter((item) => item.trim())
    .map((item) => `<p>${renderTextWithLinks(item)}</p>`)
    .join("");
}

function renderBullets(items) {
  const bullets = items.filter((item) => item.trim());
  return bullets.length
    ? `<ul>${bullets.map((item) => `<li>${renderTextWithLinks(item)}</li>`).join("")}</ul>`
    : "";
}

function renderEntry(entry, { showTechnologies = false } = {}) {
  const title = entry.title?.trim() ? renderTextWithLinks(entry.title) : "";
  const organization = entry.organization?.trim()
    ? renderTextWithLinks(entry.organization)
    : "";
  const dates = entry.dates?.trim()
    ? `<span>${renderTextWithLinks(entry.dates)}</span>`
    : "";
  const location = entry.location?.trim()
    ? `<span>${renderTextWithLinks(entry.location)}</span>`
    : "";
  const technologies = entry.technologies?.filter((item) => item.trim()) ?? [];
  const links = entry.links?.filter((item) => item.trim()) ?? [];
  const bullets = renderBullets(entry.bullets ?? []);

  return `<article class="resume-entry">
    ${(title || organization || dates) ? `<div class="entry-heading"><strong>${title || organization}</strong>${dates ? `<span class="entry-dates">${dates}</span>` : ""}</div>` : ""}
    ${title && organization || location ? `<div class="entry-subheading">${title && organization ? `<span>${organization}</span>` : ""}${location}</div>` : ""}
    ${showTechnologies && technologies.length ? `<p class="entry-skills"><strong>Technologies:</strong> ${technologies.map(renderTextWithLinks).join(", ")}</p>` : ""}
    ${links.length ? `<p class="entry-links">${links.map(renderTextWithLinks).join(" · ")}</p>` : ""}
    ${bullets}
  </article>`;
}

function renderResumeEntries(entries, options) {
  return entries.map((entry) => renderEntry(entry, options)).join("");
}

function createResumeHtml(resume) {
  const name = resume.name?.trim() ?? "";
  const contactDetails = resume.contactDetails?.filter((item) => item.trim()) ?? [];
  const sections = [
    renderSection("Professional Summary", renderParagraphs(resume.professionalSummary ?? [])),
    renderSection("Education", renderResumeEntries(resume.education ?? [])),
    renderSection(
      "Technical Skills",
      (resume.technicalSkills ?? []).filter((item) => item.trim()).length
        ? `<p class="skills">${resume.technicalSkills.filter((item) => item.trim()).map(renderTextWithLinks).join(" <span aria-hidden=\"true\">|</span> ")}</p>`
        : "",
    ),
    renderSection("Projects", renderResumeEntries(resume.projects ?? [], { showTechnologies: true })),
    renderSection(
      "Experience & Positions of Responsibility",
      renderResumeEntries(resume.experience ?? []),
    ),
    renderSection("Achievements", renderBullets(resume.achievements ?? [])),
    renderSection("Certifications", renderBullets(resume.certifications ?? [])),
    renderSection("Additional Information", renderBullets(resume.additionalInformation ?? [])),
  ].join("");

  const header =
    name || contactDetails.length
      ? `<header class="resume-header">
      ${name ? `<h1>${escapeHtml(name)}</h1>` : ""}
      ${contactDetails.length ? `<address class="contact-details">${contactDetails.map((item) => `<span>${renderContactDetail(item)}</span>`).join("")}</address>` : ""}
    </header>`
      : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(name || "Resume")}</title>
    <style>
      @page { size: A4; margin: 13mm 16mm; }
      * { box-sizing: border-box; }
      html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        margin: 0;
        color: #171b22;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10pt;
        line-height: 1.38;
        overflow-wrap: break-word;
      }
      .resume-header {
        border-bottom: 2px solid #17365d;
        margin-bottom: 9pt;
        padding-bottom: 7pt;
      }
      h1 {
        color: #17365d;
        font-size: 24pt;
        line-height: 1.08;
        margin: 0 0 5pt;
      }
      .contact-details {
        color: #303a49;
        display: flex;
        flex-wrap: wrap;
        font-size: 9pt;
        font-style: normal;
        gap: 3pt 10pt;
        margin: 0;
      }
      .resume-section { margin: 0 0 8pt; }
      .resume-section h2 {
        border-bottom: 1px solid #cbd3dd;
        break-after: avoid;
        color: #17365d;
        font-size: 11pt;
        font-weight: 700;
        letter-spacing: 0.35pt;
        line-height: 1.15;
        margin: 0 0 4pt;
        padding: 0 0 2.5pt;
        page-break-after: avoid;
        text-transform: uppercase;
      }
      .resume-section p { margin: 0 0 3pt; }
      .skills { line-height: 1.48; }
      .resume-entry {
        margin: 0 0 6pt;
      }
      .entry-heading {
        align-items: baseline;
        display: flex;
        gap: 12pt;
        justify-content: space-between;
      }
      .entry-heading > strong { color: #171b22; }
      .entry-dates {
        color: #303a49;
        flex: 0 0 auto;
        font-size: 9.5pt;
        text-align: right;
      }
      .entry-subheading {
        align-items: baseline;
        color: #303a49;
        display: flex;
        flex-wrap: wrap;
        gap: 2pt 10pt;
        justify-content: space-between;
        font-size: 9.5pt;
      }
      .entry-skills, .entry-links { font-size: 9.5pt; }
      .entry-links { overflow-wrap: anywhere; }
      ul {
        margin: 3pt 0 0;
        padding-left: 16pt;
      }
      li {
        break-inside: avoid;
        margin: 0 0 2pt;
        page-break-inside: avoid;
        padding-left: 1pt;
      }
      li::marker { color: #17365d; }
      a {
        color: #17365d;
        overflow-wrap: break-word;
        text-decoration: underline;
        text-underline-offset: 1pt;
      }
      @media screen {
        body { max-width: 210mm; margin: 0 auto; padding: 13mm 16mm; }
      }
      @media print {
        .resume-section h2 { break-after: avoid-page; }
        .entry-heading, .entry-subheading { break-inside: avoid; }
        .resume-entry { orphans: 2; widows: 2; }
      }
    </style>
  </head>
  <body>
    ${header}
    <main>${sections}</main>
  </body>
</html>`;
}

export { createResumeHtml };
