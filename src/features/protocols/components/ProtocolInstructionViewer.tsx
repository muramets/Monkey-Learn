import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Maximize, Minimize } from 'lucide-react';

interface ProtocolInstructionViewerProps {
    instruction?: string;
    isExpanded: boolean;
    onInteractionEnter?: () => void;
}

import { parseMarkdownSections, nestMarkdownSections, type HierarchicalSection } from '../../../utils/markdownUtils';
import { CollapsibleSection } from '../../../components/ui/molecules/CollapsibleSection';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

// Helper for dynamic indentation based on header level
const getIndentationClass = (level: number) => {
    return level === 1 ? "pl-0" : "pl-5";
}

// Helper for dynamic header font size in the collapse button
const getHeaderSizeClass = (level: number) => {
    switch (level) {
        case 1: return "[&_button]:text-sm";
        case 2: return "[&_button]:text-xs";
        case 3: return "[&_button]:text-[10px]";
        case 4: return "[&_button]:text-[10px]";
        case 5: return "[&_button]:text-[9px]";
        case 6: return "[&_button]:text-[9px]";
        default: return "[&_button]:text-sm";
    }
}

export const ProtocolInstructionViewer = React.memo(({ instruction, isExpanded, onInteractionEnter }: ProtocolInstructionViewerProps) => {
    const [isZenMode, setIsZenMode] = useState(false);
    useBodyScrollLock(isZenMode);

    const sections = React.useMemo(() => {
        const parsed = parseMarkdownSections(instruction || '');
        const hierarchical = nestMarkdownSections(parsed.sections);
        return { preamble: parsed.preamble, sections: hierarchical };
    }, [instruction]);

    const markdownComponents: Components = {
        h1: ({ className, style, children }) => <h1 className={clsx("text-base font-bold mb-2 mt-4 first:mt-0 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h1>,
        h2: ({ className, style, children }) => <h2 className={clsx("text-sm font-bold mb-2 mt-4 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h2>,
        h3: ({ className, style, children }) => <h3 className={clsx("text-xs font-bold mb-1 mt-3 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h3>,
        h4: ({ className, style, children }) => <h4 className={clsx("text-[11px] font-bold mb-1 mt-2 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h4>,
        h5: ({ className, style, children }) => <h5 className={clsx("text-[10px] font-bold mb-1 mt-2 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h5>,
        h6: ({ className, style, children }) => <h6 className={clsx("text-[9px] font-bold mb-1 mt-2 text-sub hover:text-text-primary transition-colors duration-200 [&_strong]:!text-inherit", className)} style={style}>{children}</h6>,
        p: ({ className, style, children }) => <p className={clsx("mb-1 last:mb-0 text-left", className)} style={style}>{children}</p>,
        div: ({ className, style, children }) => <div className={className} style={style}>{children}</div>,
        ul: ({ className, style, children }) => <ul className={clsx("list-disc list-outside pl-5 mb-1 space-y-0.5", className)} style={style}>{children}</ul>,
        ol: ({ className, style, children }) => <ol className={clsx("list-decimal list-outside pl-5 mb-1 space-y-0.5", className)} style={style}>{children}</ol>,
        li: ({ className, style, children }) => (
            <li
                className={clsx("pl-1 marker:text-sub", className)}
                style={style}
            >
                {children}
            </li>
        ),
        strong: ({ className, style, children }) => <strong className={clsx("font-bold text-text-primary", className)} style={style}>{children}</strong>,
        em: ({ className, style, children }) => <em className={clsx("italic text-text-primary/80", className)} style={style}>{children}</em>,
        code: ({ className, style, children }) => <code className={clsx("bg-sub/20 rounded px-1 py-0.5 text-[10px] font-mono text-text-primary", className)} style={style}>{children}</code>,
        blockquote: ({ className, style, children, node }) => {
            // Extract border color from data attribute if present (using safer typing than 'any')
            // Only 'Element' nodes have properties, 'Text' nodes do not, but in blockquote context it's an Element
            const props = (node as { properties?: Record<string, string | undefined> })?.properties
            const borderColor = props?.['dataBorderColor'] || props?.['data-border-color']

            const customStyle = borderColor
                ? { ...style, borderLeftColor: borderColor }
                : style

            return (
                <blockquote
                    className={clsx("border-l-4 border-main/50 pl-3 my-2 bg-sub/5 py-1 rounded-r-md text-text-primary not-italic font-medium before:!content-none after:!content-none [&_p]:before:!content-none [&_p]:after:!content-none", className)}
                    style={customStyle}
                >
                    {children}
                </blockquote>
            )
        },
        hr: ({ className, style }) => <hr className={clsx("my-4 border-t border-sub/10 w-full", className)} style={style} />,
    };

    // Header components for section titles (Collapsible triggers)
    // Inherit color by default (text-inherit) to match button hover state, unless style is present
    const headerComponents: Components = {
        h1: ({ className, style, children }) => <h1 className={clsx("text-base font-bold text-inherit", className)} style={style}>{children}</h1>,
        h2: ({ className, style, children }) => <h2 className={clsx("text-sm font-bold text-inherit", className)} style={style}>{children}</h2>,
        h3: ({ className, style, children }) => <h3 className={clsx("text-xs font-bold text-inherit", className)} style={style}>{children}</h3>,
        h4: ({ className, style, children }) => <h4 className={clsx("text-[11px] font-bold text-inherit", className)} style={style}>{children}</h4>,
        h5: ({ className, style, children }) => <h5 className={clsx("text-[10px] font-bold text-inherit", className)} style={style}>{children}</h5>,
        h6: ({ className, style, children }) => <h6 className={clsx("text-[9px] font-bold text-inherit", className)} style={style}>{children}</h6>,
        p: ({ children }) => <span className="inline">{children}</span>,
        strong: ({ children }) => <strong className="font-bold text-inherit">{children}</strong>,
    };

    const renderSection = (section: HierarchicalSection, idx: number) => (
        <CollapsibleSection
            key={idx}
            defaultOpen={false} // Collapsed by default to reduce noise
            variant="mini"
            title={
                <div className="inline-block pointer-events-none rich-text-viewer-header">
                    <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={headerComponents}
                    >
                        {section.title}
                    </ReactMarkdown>
                </div>
            }
            className={clsx(
                "mb-4",
                "[&_button]:items-start [&_button]:text-left [&_button_div:first-child]:mt-[5px]",
                "[&>div:first-child]:!mb-0", // Remove bottom margin from the header container (title)
                getIndentationClass(section.level),
                getHeaderSizeClass(section.level)
            )}
        >
            <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                {section.content.join('\n')}
            </ReactMarkdown>
            {/* Recursively render children sections */}
            {section.children.length > 0 && (
                <div className="mt-2 text-left">
                    {section.children.map((child, i) => renderSection(child, i))}
                </div>
            )}
        </CollapsibleSection>
    );

    const ContentView = (
        <div
            className="rich-text-viewer py-4 prose prose-invert prose-sm max-w-none text-sub font-mono text-xs leading-relaxed select-text cursor-text bg-transparent selection:bg-main/80 selection:text-text-primary !min-h-0 !p-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {sections.preamble && (
                <div className="mb-4">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                        {sections.preamble}
                    </ReactMarkdown>
                </div>
            )}

            {sections.sections.map((section, idx) => renderSection(section, idx))}
        </div>
    );

    // Zen Mode Portal: Wrapped in Portal to escape parent stacking context
    // We wrap AnimatePresence INSIDE the portal to manage the lifecycle of the modal
    // Note: We use createPortal directly. It renders into document.body.
    const ZenModePortal = createPortal(
        <AnimatePresence>
            {isZenMode && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 [@media(hover:hover)]:bg-black/60 [@media(hover:hover)]:backdrop-blur-sm p-10"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsZenMode(false);
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-sub-alt w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-sub-alt">
                            <div className="text-sm font-medium text-text-primary/70 uppercase tracking-widest">Protocol Instructions</div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsZenMode(false);
                                }}
                                className="p-2 hover:bg-white/5 rounded-full text-sub transition-colors"
                                title="Close Zen Mode"
                            >
                                <Minimize className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {ContentView}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );

    return (
        <>
            <AnimatePresence>
                {isExpanded && instruction && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden border-t border-sub/10 px-4 relative group"
                        onMouseEnter={() => onInteractionEnter?.()}
                    >
                        {/* Zen Mode Toggle (Visible on Hover) */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                                onClick={(e) => {
                                    console.debug('Zen Mode Maximize clicked');
                                    e.stopPropagation();
                                    setIsZenMode(true);
                                }}
                                className="p-1.5 bg-sub-alt [@media(hover:hover)]:bg-sub-alt/80 [@media(hover:hover)]:backdrop-blur hover:bg-text-primary hover:text-bg-primary text-sub border border-white/10 rounded-md transition-colors shadow-lg"
                                title="Open in Zen Mode"
                            >
                                <Maximize className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="py-4">
                            {ContentView}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {ZenModePortal}
        </>
    );
});
