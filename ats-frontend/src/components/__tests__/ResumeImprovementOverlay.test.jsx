import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResumeImprovementOverlay from '../ResumeImprovementOverlay';

describe('ResumeImprovementOverlay', () => {
  it('renders anchored suggestions with resume highlights', async () => {
    const user = userEvent.setup();

    render(
      <ResumeImprovementOverlay
        results={{
          resumeReviewOverlay: {
            resumeText: 'Jane Doe\nSkills\nReact and TypeScript\nExperience\nBuilt analytics dashboards',
            suggestions: [
              {
                id: 'overlay-1',
                category: 'skills',
                severity: 'high',
                suggestion: 'Add GraphQL to strengthen backend API coverage.',
                referenceText: 'React and TypeScript',
                status: 'anchored',
                start: 16,
                end: 36,
                lineStart: 3,
                lineEnd: 3,
              },
            ],
            summary: { anchored: 1, unmapped: 0 },
          },
        }}
      />
    );

    expect(screen.getByText('Inline Resume Improvement Map')).toBeInTheDocument();
    expect(screen.getByText('Anchored 1')).toBeInTheDocument();
    expect(screen.getByText('Add GraphQL to strengthen backend API coverage.')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /suggestion skills high/i }));

    expect(screen.getByText('React and TypeScript')).toBeInTheDocument();
  });

  it('falls back to actionable advice when overlay suggestions are missing', () => {
    render(
      <ResumeImprovementOverlay
        results={{
          resume: {
            extractedText: 'Jane Doe\nExperience\nBuilt faculty scheduling tools',
          },
          actionableAdvice: ['Quantify impact with concrete metrics.'],
        }}
      />
    );

    expect(screen.getByText('Quantify impact with concrete metrics.')).toBeInTheDocument();
    expect(screen.getByText(/not mapped to an exact snippet/i)).toBeInTheDocument();
  });

  it('shows empty text guidance when resume content is unavailable', () => {
    render(<ResumeImprovementOverlay results={{ actionableAdvice: [] }} />);

    expect(screen.getByText(/resume text is unavailable for this analysis/i)).toBeInTheDocument();
  });
});
