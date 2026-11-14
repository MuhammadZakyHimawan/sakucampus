import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('renders the loading message with a status role', () => {
    render(<LoadingState message="Memuat halaman..." />);

    expect(screen.getByRole('status')).toHaveTextContent('Memuat halaman...');
  });
});
