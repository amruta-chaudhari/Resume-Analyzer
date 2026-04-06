import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeReviewCanvas from '../ResumeReviewCanvas';

const buildAnchoredOverlay = () => {
  const resumeText = [
    'Jane Doe',
    'jane@example.com | linkedin.com/in/janedoe',
    '',
    'Summary',
    'Builds accessible student-facing products.',
    '',
    'Experience',
    'Frontend Intern',
    '- Built analytics dashboards',
    '',
    'Skills',
    'React, TypeScript, Figma',
  ].join('\n');
  const anchorSnippet = '- Built analytics dashboards';
  const start = resumeText.indexOf(anchorSnippet);
  const end = start + anchorSnippet.length;

  return {
    resumeText,
    document: {
      sections: [
        {
          id: 'resume-section-summary-1',
          title: 'Summary',
          start: resumeText.indexOf('Summary'),
          end: resumeText.indexOf('Builds accessible student-facing products.') + 'Builds accessible student-facing products.'.length,
          lineStart: 4,
          lineEnd: 5,
          blockIds: ['resume-block-3', 'resume-block-4'],
        },
        {
          id: 'resume-section-experience-2',
          title: 'Experience',
          start: resumeText.indexOf('Experience'),
          end,
          lineStart: 7,
          lineEnd: 9,
          blockIds: ['resume-block-5', 'resume-block-6', 'resume-block-7'],
        },
      ],
      blocks: [
        { id: 'resume-block-1', kind: 'name', text: 'Jane Doe', start: 0, end: 8, lineStart: 1, lineEnd: 1, sectionTitle: null },
        { id: 'resume-block-2', kind: 'contact', text: 'jane@example.com | linkedin.com/in/janedoe', start: 9, end: 50, lineStart: 2, lineEnd: 2, sectionTitle: null },
        { id: 'resume-block-3', kind: 'heading', text: 'Summary', start: 52, end: 59, lineStart: 4, lineEnd: 4, sectionTitle: 'Summary' },
        { id: 'resume-block-4', kind: 'paragraph', text: 'Builds accessible student-facing products.', start: 60, end: 101, lineStart: 5, lineEnd: 5, sectionTitle: 'Summary' },
        { id: 'resume-block-5', kind: 'heading', text: 'Experience', start: 103, end: 113, lineStart: 7, lineEnd: 7, sectionTitle: 'Experience' },
        { id: 'resume-block-6', kind: 'paragraph', text: 'Frontend Intern', start: 114, end: 129, lineStart: 8, lineEnd: 8, sectionTitle: 'Experience' },
        { id: 'resume-block-7', kind: 'bullet', text: '- Built analytics dashboards', start, end, lineStart: 9, lineEnd: 9, sectionTitle: 'Experience' },
      ],
    },
    suggestions: [
      {
        id: 'overlay-1',
        category: 'impact',
        severity: 'high',
        suggestion: 'Quantify dashboard adoption with active-user or stakeholder metrics.',
        rationale: 'Metrics make your impact easier for recruiters to evaluate quickly.',
        referenceText: anchorSnippet,
        status: 'anchored',
        start,
        end,
        lineStart: 9,
        lineEnd: 9,
        anchorMethod: 'exact',
        anchorSection: 'Experience',
        anchorBlockIds: ['resume-block-7'],
        anchorSnippet,
      },
    ],
    summary: { anchored: 1, unmapped: 0 },
  };
};

describe('ResumeReviewCanvas', () => {
  it('renders a document-style resume canvas with focused improvement details', async () => {
    const user = userEvent.setup();

    render(
      <ResumeReviewCanvas
        results={{
          resumeReviewOverlay: buildAnchoredOverlay(),
        }}
      />
    );

    expect(screen.getByText('Resume Review Canvas')).toBeInTheDocument();
    expect(screen.getByText('Sections 2')).toBeInTheDocument();
    expect(screen.getByText('Blocks 7')).toBeInTheDocument();
    expect(screen.getByText('Frontend Intern')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /quantify dashboard adoption/i }));

    expect(screen.getByText(/focused improvement/i)).toBeInTheDocument();
    expect(screen.getAllByText(/exact phrase anchor/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/focus area:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/- built analytics dashboards/i).length).toBeGreaterThan(0);
  });

  it('falls back to a locally derived document map when the backend document map is missing', () => {
    render(
      <ResumeReviewCanvas
        results={{
          resumeReviewOverlay: {
            resumeText: 'Jane Doe\nSummary\nBuilds accessible student products.\n\nSkills\nReact, TypeScript',
            suggestions: [],
            summary: { anchored: 0, unmapped: 0 },
          },
        }}
      />
    );

    expect(screen.getByText('Resume Review Canvas')).toBeInTheDocument();
    expect(screen.getByText('Sections 2')).toBeInTheDocument();
    expect(screen.getByText('Blocks 5')).toBeInTheDocument();
    expect(screen.getByText('Builds accessible student products.')).toBeInTheDocument();
  });
});
