import { useAppConfig } from "@/hooks/useAppConfig";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useAuth } from "@/hooks/useAuth";

const Privacy = () => {
  const navigate = useNavigate();
  const { getConfig, isLoading } = useAppConfig();
  const { user } = useAuth();
  
  const content = getConfig('privacy_policy_content') || '';
  const lastUpdated = getConfig('privacy_policy_last_updated') || '';

  const renderMarkdown = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-foreground">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-5 mb-3 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="text-muted-foreground ml-4">{line.slice(2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="text-muted-foreground mb-2">{line}</p>;
      });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="bg-card rounded-lg p-6 shadow-sm border">
          {renderMarkdown(content)}
          
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-8 pt-4 border-t">
              Dernière mise à jour : {new Date(lastUpdated).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>
      </div>

      {user ? <BottomNav /> : <VisitorFooter />}
    </div>
  );
};

export default Privacy;