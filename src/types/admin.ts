export interface Question {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  question: string;
  created_at: string;
  ai_response: string | null;
  ai_response_at: string | null;
  answered: boolean;
  answered_at: string | null;
  response: string | null;
  response_sent: boolean;
  response_sent_at: string | null;
  voice_recording_path?: string;
  voice_recording_duration?: number;
  attachments?: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
    created_at: string;
  }[];
}