import React from 'react';

/**
 * Shared ReactMarkdown component overrides for tooltips.
 * Module-level constant — no re-creation on render.
 */
export const MARKDOWN_TOOLTIP_COMPONENTS = {
    p: ({ ...props }: React.ComponentPropsWithoutRef<'p'>) => <p className="mb-1 last:mb-0" {...props} />,
    strong: ({ ...props }: React.ComponentPropsWithoutRef<'strong'>) => <strong className="font-bold text-text-primary" {...props} />,
    em: ({ ...props }: React.ComponentPropsWithoutRef<'em'>) => <em className="italic text-text-primary/80" {...props} />,
    hr: ({ ...props }: React.ComponentPropsWithoutRef<'hr'>) => <hr className="my-2 border-t border-sub/10 w-full block" {...props} />,
    ul: ({ ...props }: React.ComponentPropsWithoutRef<'ul'>) => <ul className="list-disc pl-4 mb-1 space-y-0.5" {...props} />,
    ol: ({ ...props }: React.ComponentPropsWithoutRef<'ol'>) => <ol className="list-decimal pl-4 mb-1 space-y-0.5" {...props} />,
    li: ({ ...props }: React.ComponentPropsWithoutRef<'li'>) => <li className="pl-0.5" {...props} />,
};
