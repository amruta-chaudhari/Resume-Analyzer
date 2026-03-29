/**
 * Resume Text Extraction Utility
 * Shared utility for extracting readable text from structured resume data.
 * Used by both ResumeFileService and ResumeAnalysisService.
 */

/**
 * Extracts readable text from structured resume data
 * @param data - Structured resume data object (e.g. from AI parsing or file import)
 * @returns Plain text representation of the resume
 */
export function extractTextFromStructuredData(data: any): string {
  const sections: string[] = [];

  const appendIfPresent = (label: string, value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      sections.push(`${label}: ${value.trim()}`);
    }
  };

  const appendBulletLines = (items: unknown) => {
    if (!Array.isArray(items)) {
      return;
    }

    items
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .forEach((item) => sections.push(`- ${item.trim()}`));
  };

  if (data.personalInfo) {
    const { fullName, email, phone, location, linkedin, website } = data.personalInfo;
    sections.push(`${fullName || 'Name'}`);
    if (email) sections.push(`Email: ${email}`);
    if (phone) sections.push(`Phone: ${phone}`);
    if (location) sections.push(`Location: ${location}`);
    if (linkedin) sections.push(`LinkedIn: ${linkedin}`);
    if (website) sections.push(`Website: ${website}`);
  }

  if (data.summary) {
    sections.push(`SUMMARY\n${data.summary}`);
  }

  if (data.experience && Array.isArray(data.experience)) {
    sections.push('EXPERIENCE');
    data.experience.forEach((exp: any) => {
      sections.push(`${exp.title || exp.position || 'Position'} at ${exp.company || 'Company'}`);
      if (exp.location) {
        sections.push(`Location: ${exp.location}`);
      }
      if (exp.startDate || exp.endDate || exp.current || exp.isCurrent) {
        const endLabel = exp.current || exp.isCurrent ? 'Present' : exp.endDate;
        sections.push([exp.startDate, endLabel].filter(Boolean).join(' - '));
      }
      if (exp.description) sections.push(exp.description);
      appendBulletLines(exp.achievements);
    });
  }

  if (data.education && Array.isArray(data.education)) {
    sections.push('EDUCATION');
    data.education.forEach((edu: any) => {
      sections.push(`${edu.degree || 'Degree'} from ${edu.institution || edu.school || 'School'}`);
      appendIfPresent('Location', edu.location);
      if (edu.graduationDate) sections.push(`Graduated: ${edu.graduationDate}`);
      if (edu.gpa) sections.push(`GPA: ${edu.gpa}`);
    });
  }

  if (data.skills && Array.isArray(data.skills)) {
    sections.push(`SKILLS\n${data.skills.join(', ')}`);
  }

  if (data.certifications && Array.isArray(data.certifications)) {
    sections.push('CERTIFICATIONS');
    data.certifications.forEach((cert: any) => {
      sections.push(`${cert.name || 'Certification'}${cert.issuer ? ` - ${cert.issuer}` : ''}`);
      if (cert.date || cert.expiryDate) {
        sections.push([cert.date, cert.expiryDate ? `Expires ${cert.expiryDate}` : null].filter(Boolean).join(' - '));
      }
    });
  }

  if (data.projects && Array.isArray(data.projects)) {
    sections.push('PROJECTS');
    data.projects.forEach((project: any) => {
      sections.push(`${project.name || 'Project'}`);
      if (project.description) sections.push(project.description);
      if (Array.isArray(project.technologies) && project.technologies.length > 0) {
        sections.push(`Technologies: ${project.technologies.join(', ')}`);
      }
      appendIfPresent('Project URL', project.url);
    });
  }

  return sections.join('\n\n');
}
