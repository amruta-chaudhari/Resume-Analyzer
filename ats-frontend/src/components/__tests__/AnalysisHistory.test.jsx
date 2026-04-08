import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalysisHistory from '../AnalysisHistory';
import { getAnalyses } from '../../services/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  getAnalyses: vi.fn(),
}));

const renderHistory = () =>
  render(
    <MemoryRouter>
      <AnalysisHistory />
    </MemoryRouter>
  );

describe('AnalysisHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders resume title from flat resumeTitle field', async () => {
    getAnalyses.mockResolvedValueOnce({
      analyses: [
        {
          id: 'analysis-1',
          jobTitle: 'Frontend Engineer',
          overallScore: 84,
          resumeTitle: 'Resume 2026',
          createdAt: '2026-04-01T10:00:00.000Z',
          modelUsed: 'openai/gpt-5.4-mini',
        },
      ],
      pagination: { totalPages: 1 },
    });

    renderHistory();

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Resume 2026/)).toBeInTheDocument();
  });

  it('shows a start-analysis call to action for empty history', async () => {
    getAnalyses.mockResolvedValueOnce({
      analyses: [],
      pagination: { totalPages: 1 },
    });

    renderHistory();

    expect(await screen.findByText(/No analyses yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start analysis/i })).toHaveAttribute('href', '/dashboard/analysis');
  });

  it('shows retry action when the initial request fails', async () => {
    getAnalyses
      .mockRejectedValueOnce(new Error('Network issue'))
      .mockResolvedValueOnce({ analyses: [], pagination: { totalPages: 1 } });

    renderHistory();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Network issue/i);

    await userEvent.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(getAnalyses).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText(/No analyses yet/i)).toBeInTheDocument();
  });
});
