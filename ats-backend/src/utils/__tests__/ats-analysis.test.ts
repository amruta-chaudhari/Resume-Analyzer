import { buildDeterministicAtsScorecard } from '../ats-analysis';

describe('buildDeterministicAtsScorecard', () => {
  it('computes deterministic keyword matches and missing keywords', () => {
    const resumeText = `
      Jane Doe
      jane@example.com | 555-123-4567
      EXPERIENCE
      Software Engineer at Example Co
      Jan 2023 - Present
      - Built React dashboards with TypeScript and AWS deployments
      SKILLS
      React, TypeScript, AWS, SQL
    `;

    const jobDescription = `
      We are looking for a frontend engineer with experience with React, TypeScript, AWS, and Docker.
      Requirements: React, TypeScript, AWS, Docker
    `;

    const result = buildDeterministicAtsScorecard(resumeText, jobDescription);

    expect(result.skillsAnalysis.matchedKeywords).toEqual(
      expect.arrayContaining(['React', 'TypeScript', 'AWS'])
    );
    expect(result.skillsAnalysis.missingKeywords).toEqual(
      expect.arrayContaining(['Docker'])
    );
    expect(result.skillsAnalysis.score).toBeGreaterThanOrEqual(50);
  });

  it('flags inconsistent date styles in formatting analysis', () => {
    const resumeText = `
      Jane Doe
      jane@example.com | 555-123-4567
      EXPERIENCE
      Analyst
      Jan 2023 - Present
      Intern
      01/2022 - 12/2022
      EDUCATION
      BSc Computer Science
      2021-05
    `;

    const result = buildDeterministicAtsScorecard(resumeText, 'Looking for an analyst with SQL experience');

    expect(result.formattingScore.issues).toEqual(
      expect.arrayContaining(['Inconsistent date formats were detected across the resume.'])
    );
    expect(result.formattingScore.score).toBeLessThan(100);
  });

  it('flags reversed date ranges as chronology issues', () => {
    const resumeText = `
      Jane Doe
      jane@example.com | 555-123-4567
      EXPERIENCE
      Developer
      Dec 2024 - Jan 2024
      - Improved API response times by 30%
      SKILLS
      Node.js, SQL
    `;

    const result = buildDeterministicAtsScorecard(resumeText, 'Need Node.js and SQL experience');

    expect(result.formattingScore.issues).toEqual(
      expect.arrayContaining(['At least one experience date range appears out of chronological order.'])
    );
  });

  it('adds experience gaps when quantified achievements are missing', () => {
    const resumeText = `
      Jane Doe
      jane@example.com | 555-123-4567
      EXPERIENCE
      Developer at Example Co
      Jan 2022 - Present
      Worked on internal tools and supported engineering teams.
      SKILLS
      React, JavaScript
    `;

    const result = buildDeterministicAtsScorecard(resumeText, 'Need React and JavaScript experience');

    expect(result.experienceRelevance.gaps).toEqual(
      expect.arrayContaining(['Add quantified outcomes to experience bullets so recruiters can measure impact quickly.'])
    );
  });

  it('does not flag top contact info when standard phone and email are present', () => {
    const resumeText = `
      Amruta Chaudhari
      Binghamton, NY | (551) 362-9483 | achaudhari@binghamton.edu | linkedin.com/in/amrutac13
      EXPERIENCE
      Engineer at Example Co
      June 2022 - July 2023
      - Improved release quality by 30%
    `;

    const result = buildDeterministicAtsScorecard(resumeText, 'Need React and TypeScript experience');

    expect(result.formattingScore.issues).not.toEqual(
      expect.arrayContaining(['Contact information is not clearly detectable at the top of the resume.'])
    );
  });

  it('does not mistake phone numbers or academic ranges for ATS date styles', () => {
    const resumeText = `
      Amruta Chaudhari
      Binghamton, NY | (551) 362-9483 | achaudhari@binghamton.edu
      EDUCATION
      Binghamton University
      August 2025
      Coursework 2020-21
      EXPERIENCE
      Engineer at Example Co
      June 2022 - July 2023
      - Improved release quality by 30%
    `;

    const result = buildDeterministicAtsScorecard(resumeText, 'Need React and TypeScript experience');

    expect(result.formattingScore.issues).not.toEqual(
      expect.arrayContaining(['Inconsistent date formats were detected across the resume.'])
    );
  });
});
