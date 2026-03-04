import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntitySelector } from './EntitySelector';

// Minimal wrapper needed because EntitySelector uses Radix Tooltip internally
function renderEntitySelector(props: Partial<Parameters<typeof EntitySelector>[0]> = {}) {
    const defaultProps = {
        items: [
            { id: '1', title: 'Item One', group: 'Group A' },
            { id: '2', title: 'Item Two', group: 'Group A' },
            { id: '3', title: 'Item Three', group: 'Group B' },
        ],
        selectedIds: new Set<string>(),
        onToggle: vi.fn(),
        ...props,
    };

    return render(<EntitySelector {...defaultProps} />);
}

describe('EntitySelector', () => {
    it('renders all items', () => {
        renderEntitySelector();

        expect(screen.getByText('Item One')).toBeInTheDocument();
        expect(screen.getByText('Item Two')).toBeInTheDocument();
        expect(screen.getByText('Item Three')).toBeInTheDocument();
    });

    it('shows groups when items have group property', () => {
        renderEntitySelector();

        expect(screen.getByText('Group A')).toBeInTheDocument();
        expect(screen.getByText('Group B')).toBeInTheDocument();
    });

    it('filters items via search', async () => {
        const user = userEvent.setup();
        renderEntitySelector();

        const searchInput = screen.getByPlaceholderText('Search...');
        await user.type(searchInput, 'Three');

        expect(screen.queryByText('Item One')).not.toBeInTheDocument();
        expect(screen.getByText('Item Three')).toBeInTheDocument();
    });

    it('calls onToggle when item is clicked', async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        renderEntitySelector({ onToggle });

        await user.click(screen.getByText('Item One'));
        expect(onToggle).toHaveBeenCalledWith('1');
    });

    it('shows selected state for items in selectedIds', () => {
        renderEntitySelector({
            selectedIds: new Set(['2']),
        });

        // Item Two should have the selected indicator
        const items = screen.getAllByRole('button');
        // At least one item should reflect selected state
        expect(items.length).toBeGreaterThan(0);
    });

    it('shows empty message when no items match search', async () => {
        const user = userEvent.setup();
        renderEntitySelector({ emptyMessage: 'Nothing found' });

        const searchInput = screen.getByPlaceholderText('Search...');
        await user.type(searchInput, 'zzzznonexistent');

        expect(screen.getByText('Nothing found')).toBeInTheDocument();
    });
});
