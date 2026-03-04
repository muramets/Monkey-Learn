import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterDropdown } from './FilterDropdown';

describe('FilterDropdown', () => {
    it('renders trigger element', () => {
        render(
            <FilterDropdown
                trigger={(isOpen) => (
                    <button data-testid="trigger">
                        {isOpen ? 'Close' : 'Open'}
                    </button>
                )}
            >
                <div>Content</div>
            </FilterDropdown>
        );

        expect(screen.getByTestId('trigger')).toBeInTheDocument();
        expect(screen.getByTestId('trigger')).toHaveTextContent('Open');
    });

    it('shows dropdown content on hover', async () => {
        const user = userEvent.setup();

        render(
            <FilterDropdown
                trigger={() => <button data-testid="trigger">Filter</button>}
            >
                <div data-testid="content">Dropdown Content</div>
            </FilterDropdown>
        );

        const container = screen.getByTestId('trigger').parentElement!;
        await user.hover(container);

        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('supports controlled open state', () => {
        render(
            <FilterDropdown
                isOpen={true}
                onOpenChange={() => { }}
                trigger={() => <button>Filter</button>}
            >
                <div data-testid="content">Content</div>
            </FilterDropdown>
        );

        const content = screen.getByTestId('content');
        // When isOpen=true, the dropdown container should be visible
        expect(content.closest('.visible')).toBeTruthy();
    });
});

describe('FilterDropdown.Item', () => {
    it('renders label and handles click', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();

        render(
            <FilterDropdown.Item
                label="Test Option"
                isActive={false}
                onClick={onClick}
            />
        );

        expect(screen.getByText('Test Option')).toBeInTheDocument();

        await user.click(screen.getByText('Test Option'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('shows active state styling', () => {
        render(
            <FilterDropdown.Item
                label="Active Item"
                isActive={true}
                onClick={() => { }}
            />
        );

        const container = screen.getByText('Active Item').closest('div.flex');
        expect(container?.className).toContain('text-text-primary');
    });
});
