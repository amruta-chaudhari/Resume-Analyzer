import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('App public routes', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders privacy page content', async () => {
    window.history.pushState({}, '', '/privacy');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Privacy policy/i })).toBeInTheDocument();
  });

  it('renders terms page content', async () => {
    window.history.pushState({}, '', '/terms');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Terms of service/i })).toBeInTheDocument();
  });

  it('renders not found page for unknown route', async () => {
    window.history.pushState({}, '', '/unknown-route');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to dashboard/i })).toBeInTheDocument();
  });
});
