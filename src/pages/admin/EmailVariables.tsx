import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/hooks/useAppConfig";
import { toast } from "sonner";
import { Save, ArrowLeft, Building2, CreditCard, Link2, Mail, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ConfigField {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
}

const COMPANY_FIELDS: ConfigField[] = [
  { key: 'invoice_company_name', label: 'Raison sociale', placeholder: 'ANR SAS' },
  { key: 'invoice_address', label: 'Adresse', placeholder: '1 rue de l\'Innovation' },
  { key: 'invoice_company_city', label: 'Ville et code postal', placeholder: '75001 Paris' },
  { key: 'invoice_siret', label: 'SIRET', placeholder: '123 456 789 00000' },
  { key: 'invoice_rcs', label: 'RCS', placeholder: 'Paris B 123 456 789' },
  { key: 'invoice_tva', label: 'N° TVA intracommunautaire', placeholder: 'FR12345678900' },
  { key: 'invoice_capital', label: 'Capital social', placeholder: '10 000 €' },
  { key: 'invoice_contact_email', label: 'Email de contact', placeholder: 'contact@anr.fr', type: 'email' },
  { key: 'invoice_phone', label: 'Téléphone', placeholder: '+33 1 23 45 67 89', type: 'tel' },
];

const BANK_FIELDS: ConfigField[] = [
  { key: 'invoice_bank_iban', label: 'IBAN', placeholder: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX' },
  { key: 'invoice_bank_bic', label: 'BIC / SWIFT', placeholder: 'BNPAFRPP' },
];

const BILLING_FIELDS: ConfigField[] = [
  { key: 'invoice_vat_rate', label: 'Taux de TVA (%)', placeholder: '20', type: 'number' },
  { key: 'invoice_payment_delay_days', label: 'Délai de paiement (jours)', placeholder: '30', type: 'number' },
  { key: 'invoice_legal_interest_rate', label: 'Taux d\'intérêt légal (%)', placeholder: '11.52', type: 'number' },
];

const LINK_FIELDS: ConfigField[] = [
  { key: 'website_url', label: 'URL du site web', placeholder: 'https://anr.fr', type: 'url' },
  { key: 'cgv_url', label: 'URL des CGV', placeholder: 'https://anr.fr/cgv', type: 'url' },
  { key: 'cgu_url', label: 'URL des CGU', placeholder: 'https://anr.fr/cgu', type: 'url' },
  { key: 'privacy_url', label: 'URL Politique de confidentialité', placeholder: 'https://anr.fr/privacy', type: 'url' },
];

const CONTACT_FIELDS: ConfigField[] = [
  { key: 'support_email', label: 'Email support', placeholder: 'support@anr.fr', type: 'email' },
  { key: 'support_phone', label: 'Téléphone support', placeholder: '+33 1 23 45 67 89', type: 'tel' },
  { key: 'dpo_email', label: 'Email DPO (RGPD)', placeholder: 'dpo@anr.fr', type: 'email' },
];

const EmailVariables = () => {
  const { configs, isLoading, updateConfig, isUpdating } = useAppConfig();
  const [localChanges, setLocalChanges] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const getValue = (key: string): string => {
    if (key in localChanges) return localChanges[key];
    const config = configs?.find(c => c.key === key);
    if (!config) return '';
    try {
      const val = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
      return String(val || '');
    } catch {
      return String(config.value || '');
    }
  };

  const setLocalValue = (key: string, value: string) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }));
  };

  const saveConfig = async (key: string) => {
    if (!(key in localChanges)) return;
    try {
      await updateConfig({ key, value: localChanges[key], category: 'facturation' });
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success('Variable mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const hasChanges = (key: string) => key in localChanges;

  const renderField = (field: ConfigField) => (
    <div key={field.key} className="space-y-2">
      <Label htmlFor={field.key} className="text-sm">{field.label}</Label>
      <div className="flex gap-2">
        <Input
          id={field.key}
          type={field.type || 'text'}
          value={getValue(field.key)}
          onChange={(e) => setLocalValue(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="flex-1"
        />
        {hasChanges(field.key) && (
          <Button size="icon" onClick={() => saveConfig(field.key)} disabled={isUpdating}>
            <Save className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Variables Email</h1>
            <p className="text-muted-foreground">Configurer les variables utilisées dans les templates email et factures</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Variables configurables
            </CardTitle>
            <CardDescription>
              Ces variables sont injectées automatiquement dans les emails et factures. Les variables calculées (comme les montants) sont générées automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["company", "bank", "billing", "links", "contact"]} className="space-y-4">
              <AccordionItem value="company" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Informations Entreprise</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {COMPANY_FIELDS.map(renderField)}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bank" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <span className="font-semibold">Coordonnées Bancaires</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {BANK_FIELDS.map(renderField)}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="billing" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold">Paramètres Facturation</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {BILLING_FIELDS.map(renderField)}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="links" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Liens Légaux</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {LINK_FIELDS.map(renderField)}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contact" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold">Contact & Support</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {CONTACT_FIELDS.map(renderField)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EmailVariables;
