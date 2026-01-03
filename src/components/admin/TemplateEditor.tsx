import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Eye,
  Code2,
  Palette,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

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
];

const TemplateEditor = ({ content, onChange, variables, previewData }: TemplateEditorProps) => {
  const [mode, setMode] = useState<'visual' | 'html' | 'preview'>('visual');
  const [htmlContent, setHtmlContent] = useState(content);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      TextStyle,
      Color,
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

  const handleHtmlChange = (html: string) => {
    setHtmlContent(html);
    onChange(html);
    if (editor) {
      editor.commands.setContent(extractBodyContent(html));
    }
  };

  const insertVariable = (variable: string) => {
    if (mode === 'visual' && editor) {
      editor.chain().focus().insertContent(`{{${variable}}}`).run();
    } else if (mode === 'html') {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = htmlContent.slice(0, start) + `{{${variable}}}` + htmlContent.slice(end);
        handleHtmlChange(newContent);
      }
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success(`Variable {{${variable}}} copiée`);
  };

  const setLink = () => {
    if (!editor || !linkUrl) return;
    
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl })
      .run();
    
    setLinkUrl('');
  };

  const renderPreview = () => {
    let rendered = htmlContent;
    Object.entries(previewData).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Toolbar */}
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

        {mode === 'visual' && editor && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleBold().run()}
              data-active={editor.isActive('bold')}
            >
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              data-active={editor.isActive('italic')}
            >
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              data-active={editor.isActive('heading', { level: 1 })}
            >
              <Heading1 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              data-active={editor.isActive('heading', { level: 2 })}
            >
              <Heading2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              data-active={editor.isActive('heading', { level: 3 })}
            >
              <Heading3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              data-active={editor.isActive('bulletList')}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              data-active={editor.isActive('orderedList')}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  data-active={editor.isActive('link')}
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
                  />
                  <Button size="sm" onClick={setLink} className="w-full">
                    Insérer le lien
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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
      </div>

      {/* Variables */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/20 overflow-x-auto">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Variables:</span>
        {variables.map((v) => (
          <Badge 
            key={v} 
            variant="secondary" 
            className="font-mono text-xs cursor-pointer hover:bg-secondary/80 shrink-0"
            onClick={() => insertVariable(v)}
          >
            {`{{${v}}}`}
            <Copy 
              className="w-3 h-3 ml-1 opacity-50 hover:opacity-100" 
              onClick={(e) => { e.stopPropagation(); copyVariable(v); }}
            />
          </Badge>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'visual' && (
          <ScrollArea className="h-full">
            <div className="p-4 prose prose-sm max-w-none">
              <EditorContent editor={editor} className="min-h-[300px] focus:outline-none" />
            </div>
          </ScrollArea>
        )}

        {mode === 'html' && (
          <Textarea
            value={htmlContent}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="h-full w-full font-mono text-xs resize-none border-0 rounded-none focus-visible:ring-0"
            placeholder="Collez votre HTML ici..."
          />
        )}

        {mode === 'preview' && (
          <ScrollArea className="h-full">
            <iframe
              srcDoc={renderPreview()}
              className="w-full min-h-[400px] bg-white"
              title="Preview"
            />
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

// Helper to extract body content from full HTML
function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  // If no body tag, check for container div
  const containerMatch = html.match(/<div class="container">([\s\S]*?)<\/div>\s*<\/body>/i);
  if (containerMatch) {
    return containerMatch[1];
  }
  return html;
}

// Helper to wrap body content back with the original template structure
function wrapWithTemplate(bodyContent: string, originalHtml: string): string {
  const beforeBody = originalHtml.match(/^[\s\S]*?<body[^>]*>/i);
  const afterBody = originalHtml.match(/<\/body>[\s\S]*$/i);
  
  if (beforeBody && afterBody) {
    return beforeBody[0] + bodyContent + afterBody[0];
  }
  
  return originalHtml;
}

export default TemplateEditor;