import React, { useState } from 'react';
import { Mic, Download, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AudioPlayerProps {
  filePath: string;
  duration?: number;
  onError: (error: string) => void;
}

// Function to convert WebM audio to MP3 format
async function convertWebmToMp3(webmBlob: Blob): Promise<Blob> {
  try {
    // Create an audio context
    const audioContext = new AudioContext();
    
    // Convert blob to array buffer
    const arrayBuffer = await webmBlob.arrayBuffer();
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Import lamejs dynamically to avoid initialization issues
    const lamejs = await import('lamejs');
    
    // Set up MP3 encoder (mono, 44.1kHz, 128kbps)
    const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
    
    // Process the audio data - convert Float32Array to Int16Array for lamejs
    const samples = new Int16Array(audioBuffer.length);
    const leftChannel = audioBuffer.getChannelData(0);
    const sampleBlockSize = 1152; // Must be divisible by 576 to make encoder happy
    const mp3Data = [];
    
    // Convert floating point to integer samples
    for (let i = 0; i < leftChannel.length; i++) {
      // Convert from [-1, 1] to [-32768, 32767]
      samples[i] = leftChannel[i] < 0 
        ? Math.max(-1, leftChannel[i]) * 0x8000 
        : Math.min(1, leftChannel[i]) * 0x7FFF;
    }
    
    // Encode to MP3 in blocks
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    // Finalize the MP3 encoding
    const mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // Create MP3 Blob from the chunks
    return new Blob(mp3Data, { type: 'audio/mp3' });
    
  } catch (error) {
    console.error('Error converting WebM to MP3:', error);
    throw new Error('Failed to convert audio to MP3 format');
  }
}

export function AudioPlayer({ filePath, duration, onError }: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    // Get the audio URL when component mounts
    const getAudioUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('voice-recordings')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error getting audio URL:', err);
        setHasError(true);
        setErrorDetails('Failed to load audio file');
        onError('Failed to load audio file');
      }
    };
    
    getAudioUrl();
    
    return () => {
      // Clean up when unmounting
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [filePath]);

  const handleDownload = async () => {
    if (!filePath) return;
    const originalFileName = filePath.split('/').pop() || `voice-recording-${Date.now()}.webm`;
    const mp3FileName = originalFileName.replace(/\.[^/.]+$/, '.mp3'); // Replace extension with .mp3
    
    try {
      setIsLoading(true);
      
      // Always get a fresh signed URL for downloads
      const { data, error } = await supabase.storage
        .from('voice-recordings')
        .createSignedUrl(filePath, 60); // 60 seconds expiry
      
      if (error) {
        throw error;
      }
      
      if (!data?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }
      
      // Fetch the file first
      const response = await fetch(data.signedUrl);
      const webmBlob = await response.blob();
      
      // Convert WebM to MP3
      setIsConverting(true);
      try {
        const mp3Blob = await convertWebmToMp3(webmBlob);
        
        // Create object URL and trigger download
        const url = window.URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = mp3FileName;
        a.target = "_blank"; // Prevents navigating away
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (conversionError) {
        console.error('MP3 conversion failed:', conversionError);
        // Fall back to downloading the original WebM file
        const url = window.URL.createObjectURL(webmBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalFileName;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
    } catch (err: any) {
      console.error('Download error:', err);
      setHasError(true);
      const errorMessage = `Failed to download ${mp3FileName}: ${err.message || 'Unknown error'}`;
      setErrorDetails(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsConverting(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Playback failed:', err);
        setHasError(true);
        setErrorDetails(`Playback failed: ${err.message}`);
        onError(`Playback failed: ${err.message}`);
      });
    }
    
    setIsPlaying(!isPlaying);
  };
    
  return (
    <div className="flex flex-col space-y-2">
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setHasError(true);
            setErrorDetails('Failed to load audio');
            onError('Failed to load audio');
          }}
          style={{ display: 'none' }}
        />
      )}
      
      <div className="flex items-center space-x-4">
        {audioUrl && (
          <button
            onClick={togglePlayPause}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
          >
            {isPlaying ? (
              <span>Pause</span>
            ) : (
              <span>Play</span>
            )}
          </button>
        )}
        
        <button
          onClick={handleDownload}
          disabled={isLoading || isConverting}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-dark-700/30 text-dark-100 hover:text-white hover:bg-dark-600/50 transition-colors disabled:opacity-50"
          title="Download recording as MP3"
        >
          {isConverting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Converting to MP3...</span>
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Downloading...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Download as MP3</span>
            </>
          )}
        </button>
        
        <div className="flex items-center text-dark-200">
          <Mic className="w-4 h-4 mr-2" />
          <span>Voice recording</span>
          {duration && (
            <span className="ml-2 text-xs text-dark-300">
              ({duration} seconds)
            </span>
          )}
        </div>
      </div>
      
      {hasError && (
        <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-3 text-red-300 text-sm flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-medium">Audio download error</span>
            <p className="mt-1 text-xs opacity-80">
              {errorDetails || 'Unable to download audio'}. 
            </p>
          </div>
        </div>
      )}
    </div>
  );
}