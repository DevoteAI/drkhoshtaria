import React, { useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Mic, Square, Trash2, Play, Pause, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onDelete: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onDelete }: VoiceRecorderProps) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
  } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: {
      mimeType: 'audio/webm'
    },
    onStop: async (blobUrl: string, blob: Blob) => {
      try {
        setIsProcessing(true);
        setError(null);
        
        // Calculate duration from the blob
        const audio = new Audio(blobUrl);
        
        // Use a promise to wait for the audio to load
        await new Promise((resolve, reject) => {
          audio.addEventListener('loadedmetadata', () => {
            const recordingDuration = Math.round(audio.duration);
            setDuration(recordingDuration);
            resolve(recordingDuration);
          });
          
          audio.addEventListener('error', (e) => {
            reject(new Error(`Audio loading error: ${e.message || 'Unknown error'}`));
          });
        });
        
        // Use the WebM blob directly instead of trying to convert to MP3
        onRecordingComplete(blob, duration);
      } catch (error) {
        console.error('Error processing audio:', error);
        setError(`${error.message || 'Unknown error'}`);
      } finally {
        setIsProcessing(false);
      }
    },
  });

  const handlePlayPause = () => {
    if (!audioElement) {
      const audio = new Audio(mediaBlobUrl);
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Unable to play recording. Please try recording again.');
      });
      
      setAudioElement(audio);
      audio.play().catch(err => {
        console.error('Playback failed:', err);
        setError(`Playback failed: ${err.message}`);
      });
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play().catch(err => {
          console.error('Playback failed:', err);
          setError(`Playback failed: ${err.message}`);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDelete = () => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setError(null);
    setDuration(0);
    onDelete();
  };

  return (
    <div className="bg-dark-700/30 rounded-xl p-6 border border-dark-600/30">
      <h4 className="text-lg font-semibold text-white mb-4">
        {t('aiChat.askDoctor.attachments.voice.title')}
      </h4>
      <p className="text-dark-100 mb-6">
        {t('aiChat.askDoctor.attachments.voice.instructions')}
      </p>

      <div className="flex items-center space-x-4">
        {status === 'recording' ? (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            <Square className="w-5 h-5" />
            <span>{t('aiChat.askDoctor.attachments.voice.stop')}</span>
          </button>
        ) : status === 'idle' && !mediaBlobUrl ? (
          <button
            onClick={startRecording}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
          >
            <Mic className="w-5 h-5" />
            <span>{t('aiChat.askDoctor.attachments.voice.start')}</span>
          </button>
        ) : null}

        {mediaBlobUrl && (
          <>
            <button
              onClick={handlePlayPause}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              disabled={isProcessing}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
              disabled={isProcessing}
            >
              <Trash2 className="w-5 h-5" />
              <span>{t('aiChat.askDoctor.attachments.voice.delete')}</span>
            </button>
            {duration > 0 && (
              <span className="text-dark-200">
                {t('aiChat.askDoctor.attachments.voice.duration', { seconds: duration })}
              </span>
            )}
            {isProcessing && (
              <span className="text-dark-200 animate-pulse">
                {t('aiChat.askDoctor.attachments.voice.processing') || 'Processing...'}
              </span>
            )}
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-400/30 rounded-lg text-red-300 text-sm flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p>Recording error: {error}</p>
            <p className="mt-1 text-xs">Please try recording again.</p>
          </div>
        </div>
      )}
    </div>
  );
}