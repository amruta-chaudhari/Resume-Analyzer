import { render, screen } from '@testing-library/react';
import FormattingScore from '../FormattingScore';

describe('FormattingScore', () => {
  it('renders formatting diagnostics and issue details', async () => {
    render(
      <FormattingScore
        formatting={{
          score: 42,
          issues: [
            'Email address is missing from the top of the resume.',
            'Possible table or multi-column formatting was detected in the extracted text.',
          ],
          suggestions: [
            'Place your primary email address in the first two lines of the document.',
            'Use a single-column layout with left-aligned content so ATS systems read the resume in order.',
          ],
          details: {
            contact: {
              emailDetected: false,
              phoneDetected: true,
              obfuscatedContactDetected: false,
              contactPlacement: 'later',
              internationalPhoneDetected: false,
            },
            sections: {
              detected: ['experience', 'skills'],
              standardCount: 2,
              creativeCount: 1,
              embeddedCount: 0,
            },
            layout: {
              probableTableLines: 3,
              probableMultiColumn: true,
              extremeIndentation: false,
              repeatedHeaderFooterArtifacts: 0,
            },
            bullets: {
              experienceLineCount: 7,
              bulletLikeLines: 0,
              decorativeBulletCount: 0,
              paragraphOnlyExperience: true,
            },
            dates: {
              styles: ['MONTH YYYY'],
              dateCount: 2,
              chronologyIssues: 1,
              hasParseableDates: true,
            },
            density: {
              lineCount: 48,
              wordCount: 700,
              isLong: false,
              isDense: true,
            },
            specialCharacters: {
              count: 12,
              ratio: 0.06,
              nonAsciiRatio: 0.01,
              highRatio: true,
            },
          },
        }}
      />
    );

    expect(screen.getByText('ATS Formatting Score')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText(/No email/)).toBeInTheDocument();
    expect(screen.getByText('Sections')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Dates')).toBeInTheDocument();
    expect(screen.getByText(/Email address is missing/)).toBeInTheDocument();
    expect(screen.getByText(/Use a single-column layout/)).toBeInTheDocument();
  });

  it('shows the empty state when formatting data is missing', () => {
    render(<FormattingScore formatting={null} />);

    expect(screen.getByText('Formatting analysis data is not available yet.')).toBeInTheDocument();
  });
});
