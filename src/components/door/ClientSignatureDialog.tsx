import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pen, Eraser, CheckCircle, Loader2 } from 'lucide-react';

interface ClientSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (signature: string, name: string, report?: string) => void;
}

export function ClientSignatureDialog({
  open,
  onOpenChange,
  onComplete
}: ClientSignatureDialogProps) {
  const [clientName, setClientName] = useState('');
  const [employeeReport, setEmployeeReport] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctxRef.current = ctx;
        
        // Fond blanc
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [open]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    if (ctxRef.current) {
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
      setIsDrawing(true);
    }
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctxRef.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    setHasSignature(true);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    if (ctxRef.current) {
      ctxRef.current.closePath();
    }
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    if (canvasRef.current && ctxRef.current) {
      ctxRef.current.fillStyle = '#ffffff';
      ctxRef.current.fillRect(0, 0, canvasRef.current.width / 2, canvasRef.current.height / 2);
      setHasSignature(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canvasRef.current || !clientName.trim()) return;

    const signatureData = canvasRef.current.toDataURL('image/png');
    onComplete(signatureData, clientName.trim(), employeeReport.trim() || undefined);
    
    // Reset
    setClientName('');
    setEmployeeReport('');
    setHasSignature(false);
  }, [clientName, employeeReport, onComplete]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            Signature du client
          </DialogTitle>
          <DialogDescription>
            Le client doit signer pour confirmer la réalisation de la prestation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nom du signataire */}
          <div className="space-y-2">
            <Label htmlFor="clientName">Nom du signataire *</Label>
            <Input
              id="clientName"
              placeholder="Nom et prénom du client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          {/* Zone de signature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Signature *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSignature}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            </div>
            <div className="relative border rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-40 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
                  <span className="text-sm">Signez ici</span>
                </div>
              )}
            </div>
          </div>

          {/* Rapport employé */}
          <div className="space-y-2">
            <Label htmlFor="report">Compte-rendu (optionnel)</Label>
            <Textarea
              id="report"
              placeholder="Notes sur l'intervention..."
              value={employeeReport}
              onChange={(e) => setEmployeeReport(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!clientName.trim() || !hasSignature}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Valider la signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
