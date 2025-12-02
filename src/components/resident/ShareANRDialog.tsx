import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mail, MessageSquare, Share2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import logoAnr from "@/assets/logo-anr.png";

interface ShareANRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anrCode: string;
  anrAddress: string;
  latitude: number;
  longitude: number;
  ownerName: string;
}

const ShareANRDialog = ({
  open,
  onOpenChange,
  anrCode,
  anrAddress,
  latitude,
  longitude,
  ownerName,
}: ShareANRDialogProps) => {
  const { toast } = useToast();

  // Generate Google Maps link
  const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  // Generate the ANR URL (visitor page with code)
  const anrUrl = `${window.location.origin}/visitor?code=${anrCode}`;

  // Message content for sharing
  const shareMessage = `🏠 ANR de ${ownerName}

📍 Adresse: ${anrAddress}

🔢 Code ANR: ${anrCode}

📱 Scanner ou saisir le code sur:
${anrUrl}

🗺️ Navigation GPS:
${mapsLink}`;

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`ANR de ${ownerName}`);
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast({ title: "Email", description: "Ouverture de votre client email..." });
  };

  const shareViaSMS = () => {
    const body = encodeURIComponent(shareMessage);
    // Check if on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(`sms:?body=${body}`, "_blank");
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareMessage);
      toast({ 
        title: "Copié!", 
        description: "Le message a été copié. Collez-le dans votre SMS." 
      });
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast({ title: "WhatsApp", description: "Ouverture de WhatsApp..." });
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ANR de ${ownerName}`,
          text: shareMessage,
          url: anrUrl,
        });
        toast({ title: "Partagé!", description: "ANR partagé avec succès" });
      } catch (error) {
        // User cancelled or error
        console.log("Share cancelled or failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareMessage);
      toast({ 
        title: "Copié!", 
        description: "Le message a été copié dans le presse-papier." 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Partager mon ANR</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl">
            <QRCodeSVG
              value={anrUrl}
              size={180}
              level="H"
              includeMargin
              imageSettings={{
                src: logoAnr,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
            <p className="text-2xl font-mono font-bold tracking-wider text-slate-900">
              {anrCode}
            </p>
          </div>

          {/* Owner Info */}
          <div className="text-center space-y-1">
            <p className="font-semibold">{ownerName}</p>
            <p className="text-sm text-muted-foreground">{anrAddress}</p>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={shareViaEmail}
            >
              <Mail className="w-6 h-6 text-primary" />
              <span className="text-xs">Email</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={shareViaSMS}
            >
              <MessageSquare className="w-6 h-6 text-green-600" />
              <span className="text-xs">SMS</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={shareViaWhatsApp}
            >
              <svg 
                className="w-6 h-6 text-green-500" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-xs">WhatsApp</span>
            </Button>
          </div>

          {/* Native Share Button */}
          <Button 
            className="w-full" 
            onClick={shareNative}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Autres options de partage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareANRDialog;
