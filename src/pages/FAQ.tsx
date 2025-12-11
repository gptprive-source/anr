import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FAQItem {
  id: string;
  section: string;
  section_icon: string | null;
  question: string;
  answer: string;
  sort_order: number;
}

interface FAQSection {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface AppConfig {
  key: string;
  value: any;
}

const iconMap: Record<string, string> = {
  'Smartphone': '📱',
  'CreditCard': '💳',
  'Users': '👥',
  'Home': '🏠',
  'Shield': '🔒',
  'Phone': '📞',
};

// Replace template variables in FAQ content with actual config values
const replaceConfigVariables = (text: string, configMap: Record<string, string>): string => {
  let result = text;
  Object.entries(configMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  return result;
};

const FAQ = () => {
  // Fetch all app config for dynamic values
  const { data: appConfigs } = useQuery({
    queryKey: ['app_config_for_faq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');
      
      if (error) throw error;
      return data as AppConfig[];
    },
  });

  // Build config map for template replacement
  const configMap: Record<string, string> = {};
  appConfigs?.forEach(config => {
    try {
      const value = typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
      // Format specific values for display
      if (config.key === 'max_call_duration_seconds') {
        configMap[config.key] = String(Math.floor(value / 60)); // Convert to minutes
        configMap['max_call_duration_minutes'] = String(Math.floor(value / 60));
      } else if (config.key === 'max_distance_meters') {
        configMap[config.key] = String(value);
      } else if (config.key === 'max_residents_per_habitation') {
        configMap[config.key] = String(value);
      } else if (config.key === 'subscription_price') {
        configMap[config.key] = String(value);
      } else if (config.key === 'doming_price') {
        configMap[config.key] = String(value);
      } else if (config.key === 'invitation_validity_hours') {
        configMap[config.key] = String(value);
      } else {
        configMap[config.key] = String(value);
      }
    } catch {
      configMap[config.key] = String(config.value);
    }
  });

  // Fetch FAQ sections from database (for ordering)
  const { data: faqSectionsData } = useQuery({
    queryKey: ['public_faq_sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_sections')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as FAQSection[];
    },
  });

  // Fetch FAQ from database
  const { data: faqItems, isLoading: faqLoading } = useQuery({
    queryKey: ['public_faq_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as FAQItem[];
    },
  });

  // Fetch support email from config
  const { data: supportEmail } = useQuery({
    queryKey: ['support_email_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'support_email')
        .maybeSingle();
      
      if (error) throw error;
      try {
        return data?.value ? JSON.parse(data.value as string) : 'support@anr.fr';
      } catch {
        return data?.value || 'support@anr.fr';
      }
    },
  });

  // Group FAQ by section with dynamic values replaced, ordered by section sort_order
  const faqSections = faqSectionsData?.map(section => {
    const sectionItems = faqItems?.filter(item => item.section === section.name) || [];
    return {
      title: section.name,
      icon: iconMap[section.icon] || '❓',
      questions: sectionItems.map(item => ({
        q: replaceConfigVariables(item.question, configMap),
        a: replaceConfigVariables(item.answer, configMap),
      })),
    };
  }).filter(section => section.questions.length > 0) || [];

  if (faqLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Questions fréquentes</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {section.questions.map((item, questionIndex) => (
                  <AccordionItem
                    key={questionIndex}
                    value={`${sectionIndex}-${questionIndex}`}
                    className="border border-blue-500/50 rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground whitespace-pre-line">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {faqSections.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune question fréquente pour le moment.</p>
            </div>
          )}

          {/* Contact section */}
          <div className="mt-8 p-6 bg-green-500/10 rounded-lg text-center border-2 border-green-500">
            <h3 className="font-semibold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Contactez notre support à l'adresse suivante :
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="text-primary font-medium hover:underline"
            >
              {supportEmail}
            </a>
          </div>
        </div>
      </main>

      <VisitorFooter />
    </div>
  );
};

export default FAQ;
