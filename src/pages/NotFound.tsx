import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="text-center p-8 rounded-2xl bg-card border border-orange-500 max-w-md w-full">
        <div className="w-20 h-20 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-orange-500" />
        </div>
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <Button asChild className="bg-blue-500 hover:bg-blue-600">
          <a href="/" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Return to Home
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;