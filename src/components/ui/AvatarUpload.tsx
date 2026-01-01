import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  fallbackText?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AvatarUpload = ({
  currentUrl,
  onUpload,
  onRemove,
  fallbackText,
  size = "md",
  className,
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner une image (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 5 Mo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    console.log("[AvatarUpload] Starting upload for file:", file.name, "size:", file.size);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      console.log("[AvatarUpload] Generated fileName:", fileName);

      // Upload to Supabase Storage (directly to bucket root, not avatars/avatars/)
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      console.log("[AvatarUpload] Upload result:", { error: uploadError, data: uploadData });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log("[AvatarUpload] Public URL generated:", publicUrl);
      console.log("[AvatarUpload] Calling onUpload callback with URL");
      
      onUpload(publicUrl);
      toast({ title: "Photo téléchargée" });
    } catch (error: any) {
      console.error("[AvatarUpload] Upload error:", error);
      toast({
        title: "Erreur d'upload",
        description: error?.message || "Impossible de télécharger l'image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onRemove?.();
  };

  const getFallbackInitials = () => {
    if (!fallbackText) return null;
    const parts = fallbackText.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fallbackText.substring(0, 2).toUpperCase();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
        {currentUrl ? (
          <AvatarImage src={currentUrl} alt="Avatar" />
        ) : null}
        <AvatarFallback className="bg-muted text-muted-foreground">
          {fallbackText ? getFallbackInitials() : <User className={iconSizeClasses[size]} />}
        </AvatarFallback>
      </Avatar>

      {/* Upload button overlay */}
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Camera className="w-3 h-3" />
        )}
      </Button>

      {/* Remove button */}
      {currentUrl && onRemove && (
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full shadow-md"
          onClick={handleRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
