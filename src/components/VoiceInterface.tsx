import { useState, useRef, useEffect, useCallback } from "react";
import { X, Mic, Camera, CameraOff, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface VoiceInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceInterface({ isOpen, onClose }: VoiceInterfaceProps) {
  const {
    isConnecting,
    isConnected,
    isSpeaking,
    startConversation,
    stopConversation,
  } = useVoiceChat();

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Could not access camera");
      setIsCameraOn(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      if (isConnected) {
        stopConversation();
      }
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera, isConnected, stopConversation]);

  // Start conversation when opened
  useEffect(() => {
    if (isOpen && !isConnected && !isConnecting) {
      startConversation();
    }
  }, [isOpen, isConnected, isConnecting, startConversation]);

  const handleClose = () => {
    stopCamera();
    if (isConnected) {
      stopConversation();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-3 w-3 rounded-full transition-colors",
              isConnected ? "bg-green-500 animate-pulse" : "bg-muted"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {isConnecting
              ? "Connecting..."
              : isConnected
              ? isSpeaking
                ? "Cloud is speaking..."
                : "Listening..."
              : "Disconnected"}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        {/* Camera View or Voice Visualization */}
        <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-secondary">
          {isCameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              {/* Voice visualization */}
              <div className="relative">
                <div
                  className={cn(
                    "h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300",
                    isSpeaking && "animate-pulse scale-110"
                  )}
                >
                  <div
                    className={cn(
                      "h-24 w-24 rounded-full bg-primary/40 flex items-center justify-center transition-all duration-300",
                      isSpeaking && "scale-110"
                    )}
                  >
                    <div
                      className={cn(
                        "h-16 w-16 rounded-full bg-primary flex items-center justify-center",
                        !isSpeaking && isConnected && "animate-pulse"
                      )}
                    >
                      {isSpeaking ? (
                        <Volume2 className="h-8 w-8 text-primary-foreground" />
                      ) : (
                        <Mic className="h-8 w-8 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {cameraError && (
                <p className="text-sm text-destructive">{cameraError}</p>
              )}
            </div>
          )}

          {/* Camera indicator overlay */}
          {isCameraOn && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-foreground">Camera On</span>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center">
          <h2 className="text-2xl font-light text-foreground mb-2">
            {isConnecting
              ? "Connecting to Cloud..."
              : isConnected
              ? isSpeaking
                ? "Cloud is responding"
                : "Speak now"
              : "Voice chat ended"}
          </h2>
          <p className="text-muted-foreground">
            {isCameraOn
              ? "Cloud can see what your camera sees"
              : "Enable camera to let Cloud see your space"}
          </p>
        </div>
      </main>

      {/* Controls */}
      <footer className="px-6 py-8">
        <div className="flex items-center justify-center gap-6">
          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-all",
              isCameraOn
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {isCameraOn ? (
              <Camera className="h-6 w-6" />
            ) : (
              <CameraOff className="h-6 w-6" />
            )}
          </button>

          {/* End Call */}
          <button
            onClick={handleClose}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all hover:opacity-90"
            title="End voice chat"
          >
            <PhoneOff className="h-7 w-7" />
          </button>

          {/* Mic indicator (visual only) */}
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-all",
              isConnected && !isSpeaking
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            )}
            title={isConnected && !isSpeaking ? "Microphone active" : "Waiting..."}
          >
            <Mic className={cn("h-6 w-6", isConnected && !isSpeaking && "animate-pulse")} />
          </div>
        </div>
      </footer>
    </div>
  );
}
