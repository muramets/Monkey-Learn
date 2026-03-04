import { describe, it, expect } from 'vitest';

describe('Test Infrastructure', () => {
    it('should have working test environment', () => {
        expect(true).toBe(true);
    });

    it('should have jest-dom matchers available', () => {
        const div = document.createElement('div');
        div.textContent = 'Hello';
        document.body.appendChild(div);
        expect(div).toBeInTheDocument();
        document.body.removeChild(div);
    });
});
