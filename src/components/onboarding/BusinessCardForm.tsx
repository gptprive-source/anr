import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, User, Building2, Mail, Phone, MapPin } from "lucide-react";
import AvatarUpload from "@/components/ui/AvatarUpload";
import MessageTemplatesEditor, { MessageTemplate } from "./MessageTemplatesEditor";

export interface BusinessCardFormData {
  avatar_url: string | null;
  company_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  show_email: boolean;
  show_phone: boolean;
  anr_code: string;
  templates: MessageTemplate[];
}

interface BusinessCardFormProps {
  userType: "particulier" | "professionnel" | "visitor";
  initialData?: Partial<BusinessCardFormData>;
  onSubmit: (data: BusinessCardFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

const BusinessCardForm = ({
  userType,
  initialData,
  onSubmit,
  loading = false,
  submitLabel = "Enregistrer",
}: BusinessCardFormProps) => {
  const [formData, setFormData] = useState<BusinessCardFormData>({
    avatar_url: null,
    company_name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    show_email: true,
    show_phone: true,
    anr_code: "",
    templates: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        templates: initialData.templates || [],
      }));
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "Le prénom est requis";
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Le nom est requis";
    }
    if (userType === "professionnel" && !formData.company_name.trim()) {
      newErrors.company_name = "Le nom de l'entreprise est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  const updateField = <K extends keyof BusinessCardFormData>(
    field: K,
    value: BusinessCardFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const showCompanyField = userType === "professionnel" || userType === "visitor";
  const isAnrReadOnly = userType !== "visitor";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center">
        <AvatarUpload
          currentUrl={formData.avatar_url}
          onUpload={(url) => updateField("avatar_url", url)}
          onRemove={() => updateField("avatar_url", null)}
          fallbackText={`${formData.first_name} ${formData.last_name}`}
          size="lg"
        />
      </div>

      {/* Company (Pro & Visitor) */}
      {showCompanyField && (
        <div className="space-y-2">
          <Label htmlFor="company_name" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Entreprise {userType === "professionnel" && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => updateField("company_name", e.target.value)}
            placeholder={userType === "visitor" ? "Le cas échéant" : "Nom de l'entreprise"}
            disabled={loading || (userType === "professionnel" && !!initialData?.company_name)}
            className={errors.company_name ? "border-destructive" : ""}
          />
          {errors.company_name && (
            <p className="text-xs text-destructive">{errors.company_name}</p>
          )}
        </div>
      )}

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="first_name" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Prénom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
            placeholder="Prénom"
            disabled={loading}
            className={errors.first_name ? "border-destructive" : ""}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">
            Nom <span className="text-destructive">*</span>
          </Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
            placeholder="Nom"
            disabled={loading}
            className={errors.last_name ? "border-destructive" : ""}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Email with toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Afficher</span>
            <Switch
              checked={formData.show_email}
              onCheckedChange={(checked) => updateField("show_email", checked)}
              disabled={loading}
            />
          </div>
        </div>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="email@exemple.com"
          disabled={loading || (userType !== "visitor" && !!initialData?.email)}
        />
      </div>

      {/* Phone with toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Téléphone
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Afficher</span>
            <Switch
              checked={formData.show_phone}
              onCheckedChange={(checked) => updateField("show_phone", checked)}
              disabled={loading}
            />
          </div>
        </div>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          placeholder="06 12 34 56 78"
          disabled={loading}
        />
      </div>

      {/* ANR Code */}
      <div className="space-y-2">
        <Label htmlFor="anr_code" className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Code ANR
        </Label>
        <Input
          id="anr_code"
          value={formData.anr_code}
          onChange={(e) => updateField("anr_code", e.target.value.toUpperCase())}
          placeholder={isAnrReadOnly ? "" : "ABC123"}
          disabled={loading || isAnrReadOnly}
          className={isAnrReadOnly ? "bg-muted" : ""}
        />
        {isAnrReadOnly && formData.anr_code && (
          <p className="text-xs text-muted-foreground">
            Code ANR associé à votre compte
          </p>
        )}
      </div>

      {/* Message templates */}
      <div className="pt-4 border-t">
        <MessageTemplatesEditor
          templates={formData.templates}
          onChange={(templates) => updateField("templates", templates)}
          disabled={loading}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {submitLabel}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Vos données sont conservées conformément à notre politique de confidentialité.
      </p>
    </form>
  );
};

export default BusinessCardForm;
