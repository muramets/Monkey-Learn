import { parseMarkdownSections, nestMarkdownSections } from './markdownUtils';
import type { MarkdownSection } from './markdownUtils';

describe('parseMarkdownSections', () => {
    it('returns empty preamble and no sections for an empty string', () => {
        const result = parseMarkdownSections('');
        expect(result).toEqual({ preamble: '', sections: [] });
    });

    it('handles null argument gracefully', () => {
        const result = parseMarkdownSections(null as unknown as string);
        expect(result).toEqual({ preamble: '', sections: [] });
    });

    it('handles undefined argument gracefully', () => {
        const result = parseMarkdownSections(undefined as unknown as string);
        expect(result).toEqual({ preamble: '', sections: [] });
    });

    it('returns preamble only when there are no headers', () => {
        const result = parseMarkdownSections('Some text\nMore text');
        expect(result.preamble).toBe('Some text\nMore text');
        expect(result.sections).toEqual([]);
    });

    it('parses a single H1 with content', () => {
        const result = parseMarkdownSections('# Title\nContent');
        expect(result.preamble).toBe('');
        expect(result.sections).toEqual([
            { title: 'Title', level: 1, content: ['Content'] },
        ]);
    });

    it('parses multiple headers at different levels', () => {
        const result = parseMarkdownSections('# A\nfoo\n## B\nbar');
        expect(result.sections).toHaveLength(2);
        expect(result.sections[0]).toEqual({ title: 'A', level: 1, content: ['foo'] });
        expect(result.sections[1]).toEqual({ title: 'B', level: 2, content: ['bar'] });
    });

    it('parses an H3 header correctly', () => {
        const result = parseMarkdownSections('### Deep\ncontent');
        expect(result.sections).toEqual([
            { title: 'Deep', level: 3, content: ['content'] },
        ]);
    });

    it('handles a header with leading spaces (indented)', () => {
        const result = parseMarkdownSections('  ## Indented');
        expect(result.sections).toEqual([
            { title: 'Indented', level: 2, content: [] },
        ]);
    });

    it('preserves empty lines within section content', () => {
        const result = parseMarkdownSections('# Title\nline1\n\nline2');
        expect(result.sections[0].content).toEqual(['line1', '', 'line2']);
    });

    it('parses multiple sections with a preamble', () => {
        const result = parseMarkdownSections('Intro\n# A\na\n# B\nb');
        expect(result.preamble).toBe('Intro');
        expect(result.sections).toHaveLength(2);
        expect(result.sections[0]).toEqual({ title: 'A', level: 1, content: ['a'] });
        expect(result.sections[1]).toEqual({ title: 'B', level: 1, content: ['b'] });
    });
});

describe('nestMarkdownSections', () => {
    it('returns an empty array for empty input', () => {
        expect(nestMarkdownSections([])).toEqual([]);
    });

    it('returns a single root with no children for one H1', () => {
        const sections: MarkdownSection[] = [
            { title: 'Root', level: 1, content: ['text'] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Root');
        expect(result[0].children).toEqual([]);
    });

    it('nests an H2 as a child of the preceding H1', () => {
        const sections: MarkdownSection[] = [
            { title: 'Parent', level: 1, content: [] },
            { title: 'Child', level: 2, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Parent');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].title).toBe('Child');
    });

    it('nests H1 > H2 > H3 hierarchy correctly', () => {
        const sections: MarkdownSection[] = [
            { title: 'H1', level: 1, content: [] },
            { title: 'H2', level: 2, content: [] },
            { title: 'H3', level: 3, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('H1');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].title).toBe('H2');
        expect(result[0].children[0].children).toHaveLength(1);
        expect(result[0].children[0].children[0].title).toBe('H3');
    });

    it('creates two separate roots for two H1s', () => {
        const sections: MarkdownSection[] = [
            { title: 'First', level: 1, content: [] },
            { title: 'Second', level: 1, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('First');
        expect(result[1].title).toBe('Second');
    });

    it('starts a new root when a second H1 follows an H2', () => {
        const sections: MarkdownSection[] = [
            { title: 'A', level: 1, content: [] },
            { title: 'A-child', level: 2, content: [] },
            { title: 'B', level: 1, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(2);
        expect(result[0].title).toBe('A');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].title).toBe('A-child');
        expect(result[1].title).toBe('B');
        expect(result[1].children).toEqual([]);
    });

    it('treats an H2 without a preceding H1 as a root', () => {
        const sections: MarkdownSection[] = [
            { title: 'Orphan', level: 2, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Orphan');
    });

    it('nests an H3 directly under H1 when H2 is skipped', () => {
        const sections: MarkdownSection[] = [
            { title: 'H1', level: 1, content: [] },
            { title: 'H3', level: 3, content: [] },
        ];
        const result = nestMarkdownSections(sections);
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('H1');
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children[0].title).toBe('H3');
    });
});
