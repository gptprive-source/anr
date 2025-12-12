import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Lock, Download, Cloud, Check, AlertTriangle, Shield, Eye, EyeOff, LogOut, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessageBackup } from "@/hooks/useMessageBackup";
import { useGoogleDriveBackup } from "@/hooks/useGoogleDriveBackup";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MessageBackup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { exportMessages, importMessages, exporting, importing } = useMessageBackup();
  const { 
    status: driveStatus, 
    backups, 
    loading: driveLoading, 
    uploading, 
    downloading,
    connect, 
    disconnect, 
    listBackups,
    uploadBackup,
    downloadBackup 
  } = useGoogleDriveBackup();
  
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [showExportPassword, setShowExportPassword] = useState(false);
  
  const [importPassword, setImportPassword] = useState("");
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [drivePassword, setDrivePassword] = useState("");
  const [showDrivePassword, setShowDrivePassword] = useState(false);
  const [driveRestorePassword, setDriveRestorePassword] = useState("");
  const [showDriveRestorePassword, setShowDriveRestorePassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load backups when connected
  useEffect(() => {
    if (driveStatus.connected) {
      listBackups();
    }
  }, [driveStatus.connected, listBackups]);

  const handleExport = async () => {
    if (exportPassword.length < 8) return;
    if (exportPassword !== exportPasswordConfirm) return;
    
    const success = await exportMessages(exportPassword);
    if (success) {
      setExportPassword("");
      setExportPasswordConfirm("");
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !importPassword) return;
    
    const success = await importMessages(selectedFile, importPassword);
    if (success) {
      setImportPassword("");
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDriveUpload = async () => {
    if (drivePassword.length < 8 || !user) return;
    
    // Fetch backup data
    const { data: resident } = await supabase
      .from("residents")
      .select("habitation_id")
      .eq("user_id", user.id)
      .eq("status", "verified")
      .maybeSingle();

    if (!resident?.habitation_id) return;

    const { data: messages } = await supabase
      .from("visitor_messages")
      .select("*")
      .eq("habitation_id", resident.habitation_id);

    const { data: replies } = await supabase
      .from("message_replies")
      .select("*")
      .eq("habitation_id", resident.habitation_id);

    const { data: keys } = await supabase
      .from("conversation_keys")
      .select("*")
      .eq("habitation_id", resident.habitation_id);

    // Get local encryption keys
    const localKeys: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("anr_resident_keys_")) {
        localKeys[key] = localStorage.getItem(key) || "";
      }
    }

    const backupData = {
      version: "1.0",
      createdAt: new Date().toISOString(),
      userId: user.id,
      messages: messages || [],
      replies: replies || [],
      encryptionKeys: keys || [],
      localEncryptionKeys: localKeys
    };

    const success = await uploadBackup(backupData, drivePassword);
    if (success) {
      setDrivePassword("");
    }
  };

  const handleDriveRestore = async () => {
    if (driveRestorePassword.length < 8) return;
    
    const data = await downloadBackup(driveRestorePassword);
    if (data) {
      // Restore local encryption keys
      const backupData = data as any;
      if (backupData.localEncryptionKeys) {
        for (const [key, value] of Object.entries(backupData.localEncryptionKeys)) {
          localStorage.setItem(key, value as string);
        }
      }
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Sauvegarde des messages
            </h1>
          </div>
        </div>

        {/* E2E Explanation - Concise */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Chiffrement de bout en bout (E2E)
          </h2>
          <p className="text-sm text-muted-foreground">
            Vos messages sont chiffrés sur votre appareil. <strong>Seuls vous et votre correspondant</strong> pouvez les lire.
          </p>
          <div className="flex items-center justify-center gap-2 py-2 text-sm">
            <span>👤</span>
            <span className="text-primary">──🔒──▶</span>
            <span className="px-2 py-1 bg-muted rounded text-xs">illisible</span>
            <span className="text-primary">──🔓──▶</span>
            <span>👤</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span>Confidentialité totale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span>Clés uniques par conversation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span>Standard AES-256</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span>Inviolable</span>
            </div>
          </div>
        </div>

        {/* Why backup - Alert */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-warning font-medium">
            <AlertTriangle className="w-5 h-5" />
            Pourquoi sauvegarder ?
          </div>
          <p className="text-sm text-muted-foreground">
            Les clés de déchiffrement sont stockées <strong>uniquement sur cet appareil</strong>. 
            Sans sauvegarde, vos messages sont perdus si vous changez de téléphone ou réinstallez l'app.
          </p>
        </div>

        {/* Two options */}
        <div className="grid gap-4">
          {/* Manual Export */}
          <div className="bg-background/50 border border-blue-500 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Export manuel</h3>
                <p className="text-xs text-muted-foreground">Téléchargez un fichier chiffré</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>100% gratuit</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>Aucun compte tiers</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>Contrôle total</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>À faire régulièrement</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label className="text-xs">Mot de passe (min. 8 caractères)</Label>
                <div className="relative">
                  <Input
                    type={showExportPassword ? "text" : "password"}
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                  >
                    {showExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Confirmer le mot de passe</Label>
                <Input
                  type={showExportPassword ? "text" : "password"}
                  value={exportPasswordConfirm}
                  onChange={(e) => setExportPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                />
                {exportPasswordConfirm && exportPassword !== exportPasswordConfirm && (
                  <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
                )}
              </div>
              <Button 
                className="w-full" 
                onClick={handleExport}
                disabled={exporting || exportPassword.length < 8 || exportPassword !== exportPasswordConfirm}
              >
                {exporting ? "Exportation..." : "Exporter mes messages"}
              </Button>
            </div>
          </div>

          {/* Google Drive */}
          <div className="bg-background/50 border border-orange-500 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Google Drive</h3>
                <p className="text-xs text-muted-foreground">
                  {driveStatus.connected ? `Connecté: ${driveStatus.email}` : "Sauvegarde automatique"}
                </p>
              </div>
              {driveStatus.connected && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={disconnect}
                  disabled={driveLoading}
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>100% gratuit</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>Multi-appareils</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Check className="w-3.5 h-3.5" />
                <span>Récupération facile</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Compte Google requis</span>
              </div>
            </div>

            {!driveStatus.connected ? (
              <Button 
                className="w-full" 
                onClick={connect}
                disabled={driveLoading}
              >
                {driveLoading ? "Connexion..." : "Connecter Google Drive"}
              </Button>
            ) : (
              <div className="space-y-4 pt-2 border-t">
                {/* Upload to Drive */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Sauvegarder maintenant</Label>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={listBackups}
                      disabled={driveLoading}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Mot de passe de chiffrement</Label>
                    <div className="relative">
                      <Input
                        type={showDrivePassword ? "text" : "password"}
                        value={drivePassword}
                        onChange={(e) => setDrivePassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowDrivePassword(!showDrivePassword)}
                      >
                        {showDrivePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleDriveUpload}
                    disabled={uploading || drivePassword.length < 8}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Sauvegarde..." : "Sauvegarder sur Google Drive"}
                  </Button>
                </div>

                {/* Existing backups */}
                {backups.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-medium">Sauvegardes existantes</Label>
                    <div className="space-y-2">
                      {backups.slice(0, 3).map((backup) => (
                        <div 
                          key={backup.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                        >
                          <div>
                            <p className="font-medium text-xs">{backup.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(backup.createdTime), "d MMM yyyy à HH:mm", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Restore from Drive */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs">Restaurer la dernière sauvegarde</Label>
                      <div className="relative">
                        <Input
                          type={showDriveRestorePassword ? "text" : "password"}
                          value={driveRestorePassword}
                          onChange={(e) => setDriveRestorePassword(e.target.value)}
                          placeholder="Mot de passe de la sauvegarde"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowDriveRestorePassword(!showDriveRestorePassword)}
                        >
                          {showDriveRestorePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button 
                        variant="outline"
                        className="w-full" 
                        onClick={handleDriveRestore}
                        disabled={downloading || driveRestorePassword.length < 8}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {downloading ? "Restauration..." : "Restaurer depuis Google Drive"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Restore section */}
        <div className="bg-background/50 border border-purple-500 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-purple-500 rotate-180" />
            </div>
            <div>
              <h3 className="font-semibold">Restaurer une sauvegarde manuelle</h3>
              <p className="text-xs text-muted-foreground">Importez un fichier .anr-backup</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".anr-backup"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? selectedFile.name : "Sélectionner un fichier"}
            </Button>

            {selectedFile && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Mot de passe de la sauvegarde</Label>
                  <div className="relative">
                    <Input
                      type={showImportPassword ? "text" : "password"}
                      value={importPassword}
                      onChange={(e) => setImportPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowImportPassword(!showImportPassword)}
                    >
                      {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleImport}
                  disabled={importing || !importPassword}
                >
                  {importing ? "Restauration..." : "Restaurer"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Security footer */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <Lock className="w-4 h-4" />
            Garantie de sécurité
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Mot de passe que vous seul connaissez</li>
            <li>• Chiffrement AES-256-GCM</li>
            <li>• ANR ne peut pas déchiffrer vos messages</li>
          </ul>
          <Link to="/privacy" className="text-xs text-primary hover:underline">
            Politique de confidentialité →
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default MessageBackup;
