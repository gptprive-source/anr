import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DomingPreviewProps {
  anrCode: string;
}

const DomingPreview = ({ anrCode }: DomingPreviewProps) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Format ANR code for display (ANR-XXXXXX)
  const formattedCode = `ANR-${anrCode.toUpperCase()}`;

  // Draw the Doming design on a canvas
  const drawDoming = async (canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext("2d")!;
    const qrSize = size * 0.55; // QR code size (smaller to fit in circle without clipping)
    const centerX = size / 2;
    const qrCenterY = size * 0.4;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Background - white with rounded corners
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    const cornerRadius = size * 0.08;
    ctx.roundRect(0, 0, size, size, cornerRadius);
    ctx.fill();

    // Border
    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = size * 0.005;
    ctx.stroke();

    // Draw circular background for QR area
    const circleRadius = size * 0.35;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(centerX, qrCenterY, circleRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw circular border around QR area
    ctx.strokeStyle = "#1E3A8A";
    ctx.lineWidth = size * 0.01;
    ctx.stroke();

    // Generate QR code URL
    const qrUrl = `https://anr.lovable.app/anr/${anrCode}`;
    
    // Create QR code canvas
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;

    // Draw QR code using dynamic import
    try {
      const QRCodeLib = await import("qrcode");
      await QRCodeLib.toCanvas(qrCanvas, qrUrl, {
        width: qrSize,
        margin: 1,
        color: {
          dark: "#1E3A8A",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "H", // High error correction for logo overlay
      });
    } catch (e) {
      // Fallback: draw a placeholder
      const qrCtx = qrCanvas.getContext("2d")!;
      qrCtx.fillStyle = "#1E3A8A";
      qrCtx.fillRect(0, 0, qrSize, qrSize);
      qrCtx.fillStyle = "white";
      qrCtx.font = `bold ${qrSize / 8}px Arial`;
      qrCtx.textAlign = "center";
      qrCtx.textBaseline = "middle";
      qrCtx.fillText("QR CODE", qrSize / 2, qrSize / 2);
    }

    // Draw QR code SQUARE (not clipped) - centered in the circle
    const qrX = centerX - qrSize / 2;
    const qrY = qrCenterY - qrSize / 2;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Draw center logo circle (white background) - smaller for high error correction
    const logoRadius = qrSize * 0.15;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(centerX, qrCenterY, logoRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw logo icon (simplified phone/doorbell icon)
    ctx.fillStyle = "#1E3A8A";
    const iconSize = logoRadius * 1.2;
    const iconX = centerX - iconSize / 4;
    const iconY = qrCenterY - iconSize / 3;
    
    // Draw a simple phone/intercom icon
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize / 2, iconSize * 0.7, size * 0.01);
    ctx.fill();
    
    // Screen
    ctx.fillStyle = "#60A5FA";
    ctx.beginPath();
    ctx.roundRect(iconX + iconSize * 0.08, iconY + iconSize * 0.08, iconSize * 0.34, iconSize * 0.35, size * 0.005);
    ctx.fill();

    // Draw ANR code box at bottom
    const boxHeight = size * 0.12;
    const boxY = size * 0.78;
    const boxWidth = size * 0.7;
    const boxX = (size - boxWidth) / 2;

    // Box background
    ctx.fillStyle = "#F3F4F6";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, size * 0.02);
    ctx.fill();

    // Box border
    ctx.strokeStyle = "#1E3A8A";
    ctx.lineWidth = size * 0.008;
    ctx.stroke();

    // ANR code text
    ctx.fillStyle = "#1E3A8A";
    ctx.font = `bold ${size * 0.055}px 'Arial', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formattedCode, centerX, boxY + boxHeight / 2);
  };

  // Generate preview on mount
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas) {
      drawDoming(canvas, 300).then(() => setPreviewReady(true));
    }
  }, [anrCode]);

  // Download HD version
  const downloadHD = async () => {
    setIsGenerating(true);
    try {
      const hdCanvas = document.createElement("canvas");
      const hdSize = 2000; // HD size for printing
      hdCanvas.width = hdSize;
      hdCanvas.height = hdSize;

      await drawDoming(hdCanvas, hdSize);

      // Download
      const link = document.createElement("a");
      link.download = `doming-${anrCode}.png`;
      link.href = hdCanvas.toDataURL("image/png");
      link.click();

      toast.success("Fichier HD téléchargé");
    } catch (error) {
      console.error("Error generating HD file:", error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex justify-center">
        <div className="relative bg-muted rounded-lg p-4">
          <canvas
            ref={previewCanvasRef}
            width={300}
            height={300}
            className="rounded-lg shadow-md"
          />
          {!previewReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Aperçu à 300x300px</p>
        <p className="font-medium">Téléchargement HD : 2000x2000px</p>
      </div>

      {/* Download Button */}
      <Button
        onClick={downloadHD}
        disabled={isGenerating || !previewReady}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Télécharger HD (2000x2000px)
          </>
        )}
      </Button>
    </div>
  );
};

export default DomingPreview;
