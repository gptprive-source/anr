import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, GraduationCap, CheckCircle, XCircle, QrCode, Smartphone, Package, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import BottomNav from "@/components/layout/BottomNav";

interface TrainingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  quiz?: {
    question: string;
    options: { id: string; text: string; correct: boolean }[];
  };
}

const Training = () => {
  const navigate = useNavigate();
  const { relayPoint, updateRelayPoint, isUpdating } = useRelayPoint();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState(false);

  const trainingSteps: TrainingStep[] = [
    {
      id: 'intro',
      title: 'Bienvenue !',
      description: 'Introduction au système de point relais ANR',
      icon: <GraduationCap className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p>Bienvenue dans la formation express Point Relais ANR !</p>
          <p>En quelques minutes, vous apprendrez à :</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Réceptionner des colis des livreurs</li>
            <li>Remettre des colis aux destinataires</li>
            <li>Utiliser le système de preuve ANR</li>
            <li>Gérer les situations exceptionnelles</li>
          </ul>
          <div className="bg-primary/10 p-4 rounded-lg mt-4">
            <p className="text-sm font-medium">💡 Durée estimée : 5-10 minutes</p>
          </div>
        </div>
      ),
    },
    {
      id: 'deposit',
      title: 'Réception de colis',
      description: 'Comment recevoir un colis d\'un livreur',
      icon: <Package className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p>Quand un livreur arrive avec des colis :</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Le livreur présente son QR de remise</strong>
              <p className="text-sm text-muted-foreground">Ce QR contient les informations de tous les colis</p>
            </li>
            <li>
              <strong>Vous scannez ce QR avec l'application</strong>
              <p className="text-sm text-muted-foreground">Allez dans "Scanner colis" → "Réception"</p>
            </li>
            <li>
              <strong>Vérifiez le nombre de colis</strong>
              <p className="text-sm text-muted-foreground">Le système affiche la liste des colis à recevoir</p>
            </li>
            <li>
              <strong>Confirmez la réception</strong>
              <p className="text-sm text-muted-foreground">Une preuve horodatée est créée automatiquement</p>
            </li>
          </ol>
          <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-lg mt-4">
            <p className="text-sm">⚠️ <strong>Scan groupé</strong> : Vous pouvez scanner plusieurs colis en une seule opération. Le système crée une preuve par colis.</p>
          </div>
        </div>
      ),
      quiz: {
        question: 'Qui présente le QR lors du dépôt de colis ?',
        options: [
          { id: 'a', text: 'Le destinataire du colis', correct: false },
          { id: 'b', text: 'Le livreur', correct: true },
          { id: 'c', text: 'Le point relais', correct: false },
        ],
      },
    },
    {
      id: 'pickup',
      title: 'Remise de colis',
      description: 'Comment remettre un colis au destinataire',
      icon: <QrCode className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p>Quand un destinataire vient récupérer son colis :</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Demandez une pièce d'identité</strong>
              <p className="text-sm text-muted-foreground">Vérifiez que le nom correspond au colis</p>
            </li>
            <li>
              <strong>Sélectionnez le colis dans l'application</strong>
              <p className="text-sm text-muted-foreground">"Scanner colis" → "Remise"</p>
            </li>
            <li>
              <strong>Affichez le QR de remise</strong>
              <p className="text-sm text-muted-foreground">Le destinataire scanne ce QR avec son téléphone</p>
            </li>
            <li>
              <strong>La preuve de remise est créée</strong>
              <p className="text-sm text-muted-foreground">Vous êtes rémunéré pour cette remise</p>
            </li>
          </ol>
        </div>
      ),
      quiz: {
        question: 'Que devez-vous faire avant de remettre un colis ?',
        options: [
          { id: 'a', text: 'Ouvrir le colis pour vérifier le contenu', correct: false },
          { id: 'b', text: 'Vérifier l\'identité du destinataire', correct: true },
          { id: 'c', text: 'Appeler le livreur', correct: false },
        ],
      },
    },
    {
      id: 'nfc',
      title: 'Mode hors-ligne (NFC)',
      description: 'Fonctionnement sans connexion internet',
      icon: <Smartphone className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <p>En cas de panne internet, le système continue de fonctionner :</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <strong>Scannez d'abord le tag NFC ANR</strong>
              <p className="text-sm text-muted-foreground">Ce tag se trouve à votre point relais</p>
            </li>
            <li>
              <strong>Le scan NFC déverrouille le mode offline</strong>
              <p className="text-sm text-muted-foreground">Vous pouvez alors scanner les QR normalement</p>
            </li>
            <li>
              <strong>Les preuves sont stockées localement</strong>
              <p className="text-sm text-muted-foreground">Elles seront synchronisées au retour de la connexion</p>
            </li>
          </ol>
          <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg mt-4">
            <p className="text-sm">📱 Le scan NFC prouve que vous êtes physiquement à l'adresse du point relais.</p>
          </div>
        </div>
      ),
      quiz: {
        question: 'Que devez-vous scanner en mode offline ?',
        options: [
          { id: 'a', text: 'Uniquement le QR du colis', correct: false },
          { id: 'b', text: 'D\'abord le tag NFC, puis le QR', correct: true },
          { id: 'c', text: 'Rien, attendez le retour d\'internet', correct: false },
        ],
      },
    },
    {
      id: 'complete',
      title: 'Félicitations !',
      description: 'Formation terminée',
      icon: <CheckCircle className="w-6 h-6" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold">Formation réussie !</h3>
          <p>Vous avez complété la formation Point Relais ANR.</p>
          <div className="bg-muted p-4 rounded-lg text-left space-y-2">
            <p className="font-medium">Récapitulatif :</p>
            <ul className="text-sm space-y-1">
              <li>✅ Réception de colis (scan QR livreur)</li>
              <li>✅ Remise de colis (affichage QR + identité)</li>
              <li>✅ Mode offline (NFC + QR)</li>
              <li>✅ Scan groupé multi-colis</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Votre demande sera validée par notre équipe sous 24-48h.
          </p>
        </div>
      ),
    },
  ];

  // Check status
  if (!relayPoint) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Formation Point Relais</h1>
          </div>
        </div>
        <div className="p-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Veuillez d'abord vous inscrire comme point relais.</p>
              <Button onClick={() => navigate('/relay/register')} className="mt-4">S'inscrire</Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Already completed
  if (relayPoint.training_completed_at) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Formation Point Relais</h1>
          </div>
        </div>
        <div className="p-4">
          <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <h3 className="font-semibold text-green-800 dark:text-green-300">Formation complétée</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                Formation réussie le {new Date(relayPoint.training_completed_at).toLocaleDateString('fr-FR')}
                {relayPoint.training_score && ` avec un score de ${relayPoint.training_score}%`}
              </p>
              <Button variant="outline" onClick={() => navigate('/relay')} className="mt-4">
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const step = trainingSteps[currentStep];
  const progress = ((currentStep + 1) / trainingSteps.length) * 100;

  const handleQuizAnswer = (stepId: string, answerId: string) => {
    setQuizAnswers(prev => ({ ...prev, [stepId]: answerId }));
    setShowResult(prev => ({ ...prev, [stepId]: true }));
  };

  const isQuizCorrect = (stepId: string) => {
    const step = trainingSteps.find(s => s.id === stepId);
    if (!step?.quiz) return true;
    const answer = quizAnswers[stepId];
    return step.quiz.options.find(o => o.id === answer)?.correct || false;
  };

  const canProceed = () => {
    if (!step.quiz) return true;
    return showResult[step.id] && isQuizCorrect(step.id);
  };

  const nextStep = () => {
    if (currentStep < trainingSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeTraining = async () => {
    // Calculate score
    const quizSteps = trainingSteps.filter(s => s.quiz);
    const correctAnswers = quizSteps.filter(s => isQuizCorrect(s.id)).length;
    const score = Math.round((correctAnswers / quizSteps.length) * 100);

    setCompleting(true);
    try {
      await updateRelayPoint({
        training_completed_at: new Date().toISOString(),
        training_score: score,
        status: 'training_validated' as any,
      });

      toast.success('Formation validée ! Votre demande est en cours de traitement.');
      navigate('/relay');
    } catch (error: any) {
      console.error('Error completing training:', error);
      toast.error(error.message || 'Erreur lors de la validation');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate('/relay') : prevStep()} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Formation Point Relais</h1>
            <p className="text-sm opacity-80">{currentStep + 1} / {trainingSteps.length} - {step.title}</p>
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                {step.icon}
              </div>
              <div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {step.content}
          </CardContent>
        </Card>

        {/* Quiz */}
        {step.quiz && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">🎯 Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{step.quiz.question}</p>
              {step.quiz.options.map((option) => {
                const isSelected = quizAnswers[step.id] === option.id;
                const showResults = showResult[step.id];
                
                let className = "p-3 rounded-lg border cursor-pointer transition-all ";
                if (showResults) {
                  if (option.correct) {
                    className += "border-green-500 bg-green-50 dark:bg-green-900/20";
                  } else if (isSelected && !option.correct) {
                    className += "border-red-500 bg-red-50 dark:bg-red-900/20";
                  } else {
                    className += "border-border opacity-50";
                  }
                } else {
                  className += isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50";
                }

                return (
                  <div
                    key={option.id}
                    className={className}
                    onClick={() => !showResult[step.id] && handleQuizAnswer(step.id, option.id)}
                  >
                    <div className="flex items-center gap-3">
                      {showResults && option.correct && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {showResults && isSelected && !option.correct && <XCircle className="w-5 h-5 text-red-600" />}
                      <span>{option.text}</span>
                    </div>
                  </div>
                );
              })}
              
              {showResult[step.id] && !isQuizCorrect(step.id) && (
                <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-lg text-sm">
                  <p>Ce n'est pas la bonne réponse. Relisez le contenu ci-dessus et réessayez.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setShowResult(prev => ({ ...prev, [step.id]: false }));
                      setQuizAnswers(prev => ({ ...prev, [step.id]: '' }));
                    }}
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          
          {currentStep < trainingSteps.length - 1 ? (
            <Button onClick={nextStep} disabled={!canProceed()} className="flex-1">
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={completeTraining} disabled={completing} className="flex-1">
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Terminer la formation
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Training;
