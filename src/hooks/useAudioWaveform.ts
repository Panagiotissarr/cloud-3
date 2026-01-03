import { useState, useEffect, useRef, useCallback } from "react";

interface UseAudioWaveformOptions {
  enabled: boolean;
  fftSize?: number;
  smoothingTimeConstant?: number;
}

export function useAudioWaveform({
  enabled,
  fftSize = 256,
  smoothingTimeConstant = 0.8,
}: UseAudioWaveformOptions) {
  const [levels, setLevels] = useState<number[]>(new Array(32).fill(0));
  const [volume, setVolume] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    dataArrayRef.current = null;
    setLevels(new Array(32).fill(0));
    setVolume(0);
  }, []);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Calculate volume (average of all frequencies)
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i];
    }
    const avgVolume = sum / dataArrayRef.current.length / 255;
    setVolume(avgVolume);

    // Get frequency bands for visualization (32 bands)
    const bandsCount = 32;
    const bandSize = Math.floor(dataArrayRef.current.length / bandsCount);
    const newLevels: number[] = [];

    for (let i = 0; i < bandsCount; i++) {
      const start = i * bandSize;
      const end = start + bandSize;
      let bandSum = 0;
      for (let j = start; j < end; j++) {
        bandSum += dataArrayRef.current[j];
      }
      // Normalize to 0-1
      newLevels.push(bandSum / bandSize / 255);
    }

    setLevels(newLevels);

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    const startAnalyzing = async () => {
      try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        // Create audio context and analyser
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = fftSize;
        analyserRef.current.smoothingTimeConstant = smoothingTimeConstant;

        // Connect microphone to analyser
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        // Initialize data array
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        // Start analyzing
        analyze();
      } catch (error) {
        console.error("Error accessing microphone for waveform:", error);
      }
    };

    startAnalyzing();

    return cleanup;
  }, [enabled, fftSize, smoothingTimeConstant, analyze, cleanup]);

  return { levels, volume };
}
