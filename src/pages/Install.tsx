import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    
    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Cloud is installed on your device. Enjoy the full app experience!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Open Cloud
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-[#1e1e2e] flex items-center justify-center shadow-lg">
            <Cloud className="w-10 h-10 text-[#b4befe]" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Install Cloud</h1>
          <p className="text-muted-foreground">
            Get the full app experience with offline access and faster loading
          </p>
        </div>

        {/* Install Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Install on Your Device
            </CardTitle>
            <CardDescription>
              Add Cloud to your home screen for quick access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deferredPrompt ? (
              <Button onClick={handleInstallClick} size="lg" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Install Cloud
              </Button>
            ) : isIOS ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <p className="font-medium text-sm">To install on iOS:</p>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      <span className="flex items-center gap-1">
                        Tap the Share button <Share className="w-4 h-4 inline" />
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      <span>Scroll down and tap "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      <span>Tap "Add" to confirm</span>
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <p className="font-medium text-sm">To install on Android:</p>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      <span className="flex items-center gap-1">
                        Tap the menu button <MoreVertical className="w-4 h-4 inline" />
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      <span>Tap "Install app" or "Add to Home Screen"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      <span>Tap "Install" to confirm</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Works Offline</p>
                  <p className="text-sm text-muted-foreground">
                    Access Cloud even without internet connection
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Full Screen Experience</p>
                  <p className="text-sm text-muted-foreground">
                    No browser bars - feels like a native app
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Instant Launch</p>
                  <p className="text-sm text-muted-foreground">
                    Open directly from your home screen
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/")} className="w-full">
          Continue in Browser
        </Button>
      </div>
    </div>
  );
};

export default Install;
