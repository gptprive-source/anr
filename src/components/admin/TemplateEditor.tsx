import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  Code2,
  Palette,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  Undo,
  Redo,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  variables: string[];
  previewData: Record<string, string>;
}

const colors = [
  '#000000', '#333333', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899',
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
];

const TemplateEditor = ({ content, onChange, variables, previewData }: TemplateEditorProps) => {
  const [mode, setMode] = useState<'visual' | 'html' | 'preview'>('visual');
  const [htmlContent, setHtmlContent] = useState(content);
  const [linkUrl, setLinkUrl] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: extractBodyContent(content),
    onUpdate: ({ editor }) => {
      const newContent = wrapWithTemplate(editor.getHTML(), content);
      onChange(newContent);
      setHtmlContent(newContent);
    },
  });

  useEffect(() => {
    if (mode === 'visual' && editor) {
      const bodyContent = extractBodyContent(content);
      if (editor.getHTML() !== bodyContent) {
        editor.commands.setContent(bodyContent);
      }
    }
    setHtmlContent(content);
  }, [content, mode, editor]);

  const handleHtmlChange = useCallback((html: string) => {
    setHtmlContent(html);
    onChange(html);
    if (editor) {
      editor.commands.setContent(extractBodyContent(html));
    }
  }, [editor, onChange]);

  const insertVariable = useCallback((variable: string) => {
    if (mode === 'visual' && editor) {
      editor.chain().focus().insertContent(`{{${variable}}}`).run();
    } else if (mode === 'html') {
      const textarea = document.querySelector('textarea[data-html-editor]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = htmlContent.slice(0, start) + `{{${variable}}}` + htmlContent.slice(end);
        handleHtmlChange(newContent);
        // Restore cursor position
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
        }, 0);
      }
    }
  }, [mode, editor, htmlContent, handleHtmlChange]);

  const copyVariable = useCallback((variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success(`Variable {{${variable}}} copiée`);
  }, []);

  const setLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl })
      .run();
    
    setLinkUrl('');
  }, [editor, linkUrl]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const renderPreview = useCallback(() => {
    let rendered = htmlContent;
    Object.entries(previewData).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  }, [htmlContent, previewData]);

  // Syntax highlighting for HTML mode
  const highlightHtml = useCallback((html: string) => {
    // Simple line numbers
    const lines = html.split('\n');
    return lines.map((line, i) => (
      <div key={i} className="flex">
        <span className="w-10 text-right pr-3 text-muted-foreground select-none opacity-50 text-xs">
          {i + 1}
        </span>
        <span className="flex-1 text-xs font-mono whitespace-pre">{line}</span>
      </div>
    ));
  }, []);

  const ToolbarButton = ({ 
    onClick, 
    active, 
    icon: Icon, 
    tooltip 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    icon: React.ElementType; 
    tooltip: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={onClick}
          >
            <Icon className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
      {/* Mode Tabs */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'html' | 'preview')}>
          <TabsList className="h-8">
            <TabsTrigger value="visual" className="text-xs px-3 h-7">
              <Palette className="w-3 h-3 mr-1" />
              Visuel
            </TabsTrigger>
            <TabsTrigger value="html" className="text-xs px-3 h-7">
              <Code2 className="w-3 h-3 mr-1" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3 h-7">
              <Eye className="w-3 h-3 mr-1" />
              Aperçu
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'preview' && (
          <div className="flex items-center gap-1">
            <Button
              variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewDevice('desktop')}
            >
              <Monitor className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setPreviewDevice('mobile')}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Visual Mode Toolbar */}
      {mode === 'visual' && editor && (
        <div className="flex items-center gap-1 p-2 border-b bg-muted/20 flex-wrap">
          {/* Undo/Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            tooltip="Annuler"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            tooltip="Rétablir"
          />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Text Formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={Bold}
            tooltip="Gras (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={Italic}
            tooltip="Italique (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            icon={UnderlineIcon}
            tooltip="Souligné (Ctrl+U)"
          />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            tooltip="Titre 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            tooltip="Titre 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            tooltip="Titre 3"
          />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            icon={AlignLeft}
            tooltip="Aligner à gauche"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            icon={AlignCenter}
            tooltip="Centrer"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            icon={AlignRight}
            tooltip="Aligner à droite"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            active={editor.isActive({ textAlign: 'justify' })}
            icon={AlignJustify}
            tooltip="Justifier"
          />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={List}
            tooltip="Liste à puces"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={ListOrdered}
            tooltip="Liste numérotée"
          />
          
          <div className="w-px h-5 bg-border mx-1" />
          
          {/* Link */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={editor.isActive('link') ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setLink()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={setLink} className="flex-1">
                    Insérer le lien
                  </Button>
                  {editor.isActive('link') && (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                    >
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Table */}
          <ToolbarButton
            onClick={insertTable}
            active={editor.isActive('table')}
            icon={TableIcon}
            tooltip="Insérer un tableau"
          />

          {/* Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <div 
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <div className="grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Variables */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/10 overflow-x-auto">
        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Variables:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {variables.map((v) => (
            <Badge 
              key={v} 
              variant="outline" 
              className="font-mono text-xs cursor-pointer hover:bg-primary/10 shrink-0 group"
              onClick={() => insertVariable(v)}
            >
              <span className="text-primary">{`{{${v}}}`}</span>
              <Copy 
                className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                onClick={(e) => { e.stopPropagation(); copyVariable(v); }}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'visual' && (
          <ScrollArea className="h-full">
            <div className="p-4 min-h-[300px]">
              <EditorContent 
                editor={editor} 
                className="prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted" 
              />
            </div>
          </ScrollArea>
        )}

        {mode === 'html' && (
          <div className="h-full flex flex-col">
            <textarea
              data-html-editor
              value={htmlContent}
              onChange={(e) => handleHtmlChange(e.target.value)}
              className="flex-1 w-full font-mono text-xs resize-none border-0 rounded-none focus-visible:ring-0 bg-slate-950 text-slate-100 p-4"
              placeholder="Collez votre HTML ici..."
              spellCheck={false}
            />
          </div>
        )}

        {mode === 'preview' && (
          <div className="h-full overflow-auto bg-slate-100 p-4">
            <div className={`mx-auto ${previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-full'} transition-all duration-300`}>
              <iframe
                srcDoc={renderPreview()}
                className="w-full bg-white shadow-lg"
                title="Preview"
                style={{ 
                  border: previewDevice === 'mobile' ? '8px solid #333' : 'none', 
                  borderRadius: previewDevice === 'mobile' ? '20px' : '0',
                  minHeight: '80vh'
                }}
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement;
                  if (iframe.contentDocument) {
                    const height = iframe.contentDocument.body.scrollHeight + 50;
                    iframe.style.height = Math.max(500, height) + 'px';
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to extract body content from full HTML
function extractBodyContent(html: string): string {
  // Try to find content within the main container
  const containerMatch = html.match(/<div[^>]*class="container"[^>]*>([\s\S]*?)<\/div>\s*<\/body>/i);
  if (containerMatch) {
    return containerMatch[1];
  }
  
  // Try to find body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  
  return html;
}

// Helper to wrap body content back with the original template structure
function wrapWithTemplate(bodyContent: string, originalHtml: string): string {
  // Check if original has container structure
  const containerMatch = originalHtml.match(/^([\s\S]*?<div[^>]*class="container"[^>]*>)([\s\S]*?)(<\/div>\s*<\/body>[\s\S]*$)/i);
  if (containerMatch) {
    return containerMatch[1] + bodyContent + containerMatch[3];
  }
  
  // Check for body structure
  const beforeBody = originalHtml.match(/^([\s\S]*?<body[^>]*>)/i);
  const afterBody = originalHtml.match(/(<\/body>[\s\S]*$)/i);
  
  if (beforeBody && afterBody) {
    return beforeBody[1] + bodyContent + afterBody[1];
  }
  
  return originalHtml;
}

export default TemplateEditor;