import React, { useRef, useEffect, useState, useCallback } from 'react';
import { faceMeshService } from '@/services/faceMeshService';
import { devLog } from '@/utils/devLog';

interface LiveFaceDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  onFaceDetected?: (detected: boolean) => void;
  className?: string;
}

interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

interface DetectedFace {
  keypoints: FaceLandmark[];
  box: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
}

const LiveFaceDetection: React.FC<LiveFaceDetectionProps> = ({
  videoRef,
  isActive,
  onFaceDetected,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Initialize FaceMesh detector using singleton service
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        devLog.log('🔧 [Live Detection] Initializing face detector for AR effects...');
        devLog.log('🔧 [Live Detection] isActive:', isActive);
        
        // Use singleton FaceMesh service for better performance
        const initialized = await faceMeshService.initialize();
        
        if (initialized) {
          setDetectorReady(true);
          devLog.log('✅ [Live Detection] Real-time face detector ready (using shared instance)');
        } else {
          console.warn('⚠️ [Live Detection] Failed to initialize face detector');
        }
        
      } catch (err) {
        console.warn('⚠️ [Live Detection] Failed to initialize:', err);
        // Don't show error to user, this is optional enhancement
      }
    };

    if (isActive) {
      initializeDetector();
    }

    return () => {
      devLog.log('🧹 [Cleanup] Disposing LiveFaceDetection resources...');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Release reference to the singleton service
      faceMeshService.release();
      devLog.log('✅ [Cleanup] Released FaceMesh service reference');
    };
  }, [isActive]);

  // Draw minimal face landmarks for live feedback
  const drawLiveLandmarks = useCallback((faces: DetectedFace[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (faces.length === 0) {
      setFaceDetected(false);
      if (onFaceDetected) onFaceDetected(false);
      return;
    }

    setFaceDetected(true);
    if (onFaceDetected) onFaceDetected(true);

    faces.forEach((face) => {
      // Animated pulsing effect
      const pulseIntensity = Math.sin(animationPhase * 0.1) * 0.3 + 0.7;
      
      // Draw face bounding box with pulse
      ctx.strokeStyle = `rgba(0, 255, 159, ${pulseIntensity})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(
        face.box.xMin,
        face.box.yMin, 
        face.box.width,
        face.box.height
      );
      ctx.setLineDash([]);

      // Draw key landmarks only (for performance)
      const keyLandmarks = [
        // Eyes
        ...face.keypoints.slice(33, 42), // Right eye
        ...face.keypoints.slice(362, 374), // Left eye
        // Nose tip
        face.keypoints[1], face.keypoints[2],
        // Mouth corners  
        face.keypoints[61], face.keypoints[291],
        // Face outline key points
        face.keypoints[10], face.keypoints[152], face.keypoints[175]
      ].filter(Boolean);

      // Draw glowing landmarks
      ctx.fillStyle = `rgba(0, 255, 159, ${pulseIntensity})`;
      ctx.shadowColor = '#00FF9F';
      ctx.shadowBlur = 8;
      
      keyLandmarks.forEach((landmark, i) => {
        if (!landmark) return;
        
        const x = landmark.x;
        const y = landmark.y;
        
        // Staggered animation for visual appeal
        const staggerDelay = i * 2;
        const staggeredPulse = Math.sin((animationPhase - staggerDelay) * 0.08) * 0.5 + 1;
        
        ctx.beginPath();
        ctx.arc(x, y, 2 * staggeredPulse, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.shadowBlur = 0;

      // AR-style "AI 인식 중" indicator that follows the face
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0, 255, 159, 0.9)';
      ctx.fillText(
        'Detecting your face...',
        face.box.xMin,
        face.box.yMin - 15
      );

      // AR animation: Orbiting dots around face (like Instagram/Snapchat filters)
      for (let i = 0; i < 6; i++) {
        const angle = (animationPhase * 0.02 + i * Math.PI / 3);
        const radius = Math.min(face.box.width, face.box.height) * 0.6;
        const centerX = face.box.xMin + face.box.width / 2;
        const centerY = face.box.yMin + face.box.height / 2;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.fillStyle = `rgba(0, 255, 159, ${0.3 + Math.sin(animationPhase * 0.05 + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [animationPhase, onFaceDetected, videoRef]);

  // Real-time detection loop with memory management
  const detectFaces = useCallback(async () => {
    if (!detectorReady || !videoRef.current || !isActive) {
      devLog.log('⏭️ [Detection Loop] Skipping - conditions not met:', {
        hasDetector: detectorReady,
        hasVideo: !!videoRef.current,
        isActive
      });
      return;
    }

    const video = videoRef.current;
    
    // Check if video is ready
    if (video.readyState !== 4 || video.videoWidth === 0) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    let detectedFaces: DetectedFace[] = [];

    try {
      // Log detection attempt periodically
      if (animationPhase % 30 === 0) {
        devLog.log('🔍 [Detection Loop] Running face detection...');
      }
      
      // Detect faces using singleton service (MediaPipe optimized for this)
      const faces = await faceMeshService.estimateFaces(video);
      
      // Convert to our format for AR visualization
      detectedFaces = faces.map(face => ({
        keypoints: face.keypoints.map(kp => ({
          x: kp.x,
          y: kp.y,
          z: (kp as any).z || 0
        })),
        box: {
          xMin: face.box.xMin,
          yMin: face.box.yMin,
          xMax: face.box.xMax,
          yMax: face.box.yMax,
          width: face.box.width,
          height: face.box.height,
        }
      }));

      drawLiveLandmarks(detectedFaces);
      setAnimationPhase(prev => prev + 1);
      
      if (animationPhase % 30 === 0 && detectedFaces.length > 0) {
        devLog.log(`✨ [Detection Loop] Drawing ${detectedFaces.length} face(s)`);
      }

    } catch (error) {
      console.warn('⚠️ [Live Detection] Frame detection failed:', error);
    }

    // Continue detection loop (throttled to ~8 FPS for better memory management)
    setTimeout(() => {
      if (isActive && detectorReady) {
        animationFrameRef.current = requestAnimationFrame(detectFaces);
      }
    }, 125); // ~8 FPS - better balance for memory management

  }, [detectorReady, isActive, drawLiveLandmarks, videoRef, animationPhase]);

  // Start/stop detection when detector becomes available
  useEffect(() => {
    devLog.log('🔄 [LiveFaceDetection] Detection state changed:', {
      isActive,
      hasDetector: detectorReady,
      hasVideoRef: !!videoRef.current
    });
    
    if (isActive && detectorReady && videoRef.current) {
      devLog.log('▶️ [LiveFaceDetection] Starting face detection loop');
      setIsDetecting(true);
      
      // Start the detection loop
      const startDetection = async () => {
        devLog.log('🚀 [LiveFaceDetection] Initiating first detection frame');
        await detectFaces();
      };
      
      startDetection();
    } else {
      devLog.log('⏸️ [LiveFaceDetection] Stopping face detection');
      setIsDetecting(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    return () => {
      // Stop detection loop and clean up resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clean up canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      
    };
  }, [isActive, detectorReady, videoRef]); // Removed detectFaces from dependencies to avoid infinite loop

  return (
    <>
      {/* Overlay canvas for live face detection */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full pointer-events-none z-50 ${className}`}
        style={{ 
          mixBlendMode: 'normal', // Changed from 'screen' for better visibility
          opacity: isDetecting ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      
      {/* Status indicator */}
      {isDetecting && faceDetected && (
        <div className="absolute top-4 right-4 z-40 bg-green-500 bg-opacity-90 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span>AI detection in progress</span>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveFaceDetection;
