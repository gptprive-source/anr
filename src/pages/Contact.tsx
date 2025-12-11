import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, CheckCircle, Building2, User, Briefcase, Newspaper, TrendingUp, Megaphone, Monitor, Landmark, FileText, Shield, Users, X } from "lucide-react";
import VisitorFooter from "@/components/layout/VisitorFooter";
const departmentLabels = {
  administratif: {
    label: "Administratif",
    icon: FileText
  },
  commercial: {
    label: "Commercial",
    icon: Briefcase
  },
  partenariat: {
    label: "Partenariat",
    icon: Building2
  },
  presse: {
    label: "Presse",
    icon: Newspaper
  },
  investisseurs: {
    label: "Investisseurs",
    icon: TrendingUp
  },
  communication: {
    label: "Communication",
    icon: Megaphone
  },
  informatique: {
    label: "Informatique",
    icon: Monitor
  },
  collectivites: {
    label: "Collectivités territoriales",
    icon: Landmark
  }
};
const contactSchema = z.object({
  sender_type: z.enum(["particulier", "societe", "collectivites"]),
  company_name: z.string().optional(),
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  anr_code: z.string().optional(),
  department: z.enum(["administratif", "commercial", "partenariat", "presse", "investisseurs", "communication", "informatique", "collectivites"]),
  subject: z.string().optional(),
  message: z.string().min(10, "Message trop court (10 caractères minimum)")
});
type ContactFormData = z.infer<typeof contactSchema>;
const Contact = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: {
      errors
    }
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      sender_type: "particulier",
      department: "commercial"
    }
  });
  const senderType = watch("sender_type");
  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      const {
        data: insertedMessage,
        error
      } = await supabase.from("contact_messages").insert({
        sender_type: data.sender_type,
        company_name: data.company_name || null,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        anr_code: data.anr_code || null,
        department: data.department,
        subject: data.subject || null,
        message: data.message
      }).select().single();
      if (error) throw error;
      await supabase.functions.invoke("notify-contact-message", {
        body: {
          messageId: insertedMessage.id
        }
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setIsLoading(false);
    }
  };
  if (isSubmitted) {
    return <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center border-2 border-green-500">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center border-2 border-green-500">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Message envoyé !</h2>
                <p className="text-muted-foreground">
                  Merci de nous avoir contacté. Notre équipe vous répondra dans les plus brefs délais.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link to="/">Retour à l'accueil</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <VisitorFooter />
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center border border-primary">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ANR</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3">
              <X onClick={() => window.history.back()} className="w-6 h-6 text-orange-500 cursor-pointer mr-0 pr-[7px]" />
              <h1 className="text-3xl font-bold">Contactez-nous</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Nous sommes à votre écoute pour toute question ou demande
            </p>
          </div>

          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-500" />
                </div>
                Formulaire de contact
              </CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-[30px]">
                {/* Sender Type */}
                <div className="space-y-3">
                  <Label>Vous êtes *</Label>
                  <RadioGroup defaultValue="particulier" onValueChange={value => setValue("sender_type", value as "particulier" | "societe")} className="flex flex-wrap gap-3 sm:gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="particulier" id="particulier" />
                      <Label htmlFor="particulier" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-blue-500" />
                        </div>
                        Particulier
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="societe" id="societe" />
                      <Label htmlFor="societe" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                        <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <Building2 className="w-3 h-3 text-orange-500" />
                        </div>
                        Société
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="collectivites" id="collectivites" />
                      <Label htmlFor="collectivites" className="flex items-center gap-2 cursor-pointer text-sm sm:text-base">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Landmark className="w-3 h-3 text-purple-500" />
                        </div>
                        Collectivité
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Company/Entity Name */}
                {(senderType === "societe" || senderType === "collectivites") && <div className="space-y-2">
                    <Label htmlFor="company_name">
                      {senderType === "collectivites" ? "Nom de la collectivité" : "Nom de l'entreprise"}
                    </Label>
                    <Input id="company_name" {...register("company_name")} placeholder={senderType === "collectivites" ? "Nom de votre collectivité" : "Nom de votre entreprise"} />
                  </div>}

                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input id="first_name" {...register("first_name")} placeholder="Votre prénom" className={errors.first_name ? "border-destructive" : ""} />
                    {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input id="last_name" {...register("last_name")} placeholder="Votre nom" className={errors.last_name ? "border-destructive" : ""} />
                    {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" {...register("email")} placeholder="votre@email.com" className={errors.email ? "border-destructive" : ""} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" type="tel" {...register("phone")} placeholder="06 12 34 56 78" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse postale</Label>
                  <Input id="address" {...register("address")} placeholder="Votre adresse complète" />
                </div>

                {/* ANR Code */}
                <div className="space-y-2">
                  <Label htmlFor="anr_code">Code ANR (si vous en avez un)</Label>
                  <Input id="anr_code" {...register("anr_code")} placeholder="ANR-XXXXXX" />
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <Label>Service à contacter *</Label>
                  <Select defaultValue="commercial" onValueChange={value => setValue("department", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un service" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(departmentLabels).map(([value, {
                      label,
                      icon: Icon
                    }]) => <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {label}
                          </div>
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Objet du message</Label>
                  <Input id="subject" {...register("subject")} placeholder="Objet de votre demande" />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Votre message *</Label>
                  <Textarea id="message" {...register("message")} placeholder="Décrivez votre demande en détail..." rows={6} className={errors.message ? "border-destructive" : ""} />
                  {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Envoi en cours...
                    </div> : <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Envoyer le message
                    </div>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <VisitorFooter />
    </div>;
};
export default Contact;