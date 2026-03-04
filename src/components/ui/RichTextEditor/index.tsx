/**
 * RichTextEditor - Barrel Export
 * 
 * This file provides backward compatibility for existing imports.
 * Components can import from either:
 * - import { RichTextEditor } from '@/components/ui/RichTextEditor'
 * - import { RichTextEditor } from '@/components/ui/RichTextEditor/RichTextEditor'
 */

export { RichTextEditor } from './RichTextEditor'
export { RichTextViewer } from './RichTextViewer'
export { EDITOR_PROSE_CLASSES } from './constants/editorStyles'
export type { RichTextEditorProps } from './types'
