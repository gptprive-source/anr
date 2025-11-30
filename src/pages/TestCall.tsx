import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CallInterface from "@/components/call/CallInterface";

const TestCall = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const callIdParam = searchParams.get("callId");

  const [callId, setCallId] = useState(callIdParam || crypto.randomUUID());
  const [role, setRole] = useState<"visitor" | "resident" | null>(
    roleParam === "visitor" ? "visitor" : roleParam === "resident" ? "resident" : null
  );

  // If we have role from URL, go directly to call
  if (role) {
    return (
      <CallInterface
        isResident={role === "resident"}
        callerName={role === "visitor" ? "Vous (Visiteur)" : "Visiteur Test"}
        anrAddress="Test - 12 Rue des Lilas, Paris"
        callId={callId}
      />
    );
  }

  // Selection screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="gradient-text">Test Appel Daily.co</CardTitle>
          <CardDescription>
            Testez l'appel vidéo entre deux onglets/appareils
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">ID de l'appel</label>
            <Input
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              placeholder="Entrez un ID d'appel"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez le même ID sur les deux appareils/onglets
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="default"
              className="h-24 flex flex-col gap-2"
              onClick={() => setRole("visitor")}
            >
              <span className="text-lg">📱</span>
              <span>Visiteur</span>
              <span className="text-xs opacity-70">Initie l'appel</span>
            </Button>
            
            <Button
              variant="secondary"
              className="h-24 flex flex-col gap-2"
              onClick={() => setRole("resident")}
            >
              <span className="text-lg">🏠</span>
              <span>Résident</span>
              <span className="text-xs opacity-70">Reçoit l'appel</span>
            </Button>
          </div>

          <div className="bg-secondary/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez cette page dans deux onglets ou appareils</li>
              <li>Utilisez le même ID d'appel sur les deux</li>
              <li>Cliquez sur "Visiteur" dans un onglet</li>
              <li>Cliquez sur "Résident" puis décrochez dans l'autre</li>
              <li>La vidéo devrait s'afficher!</li>
            </ol>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            <p>Liens rapides:</p>
            <div className="flex gap-2 justify-center mt-2">
              <a 
                href={`/test-call?role=visitor&callId=${callId}`}
                target="_blank"
                className="text-primary hover:underline"
              >
                Ouvrir Visiteur →
              </a>
              <a 
                href={`/test-call?role=resident&callId=${callId}`}
                target="_blank"
                className="text-primary hover:underline"
              >
                Ouvrir Résident →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestCall;
