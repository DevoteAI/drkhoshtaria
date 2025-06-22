# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 5173
- `npm run build` - Build for production (includes TypeScript compilation)
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run preview` - Preview production build

### Database Operations
- `npx supabase db push` - Push local migrations to Supabase
- Check `supabase/migrations/` for database schema history

## Architecture Overview

### Core Technology Stack
- React 18 with TypeScript
- Vite build tool with custom PDF.js worker setup
- Tailwind CSS for styling with custom dark theme
- Supabase for database and authentication
- Flowise API integration for AI chat functionality

### File Processing Pipeline
The application has a sophisticated multi-format file processing system:

**PDF Processing** (`src/utils/pdfTextExtractor.ts`):
- Client-side text extraction using PDF.js
- Automatic OCR fallback for image-based PDFs using Tesseract.js
- Character encoding fixes for Georgian and Russian text
- Token count estimation and text truncation for API limits

**File Upload Architecture** (`src/utils/fileUpload.ts`):
- Unified processing pipeline for all file types
- Smart routing: PDFs → text extraction, Images → compression, Audio → direct upload
- Progress tracking with real-time UI updates
- Error handling with graceful fallbacks

**Chat API Integration** (`src/lib/api/chat.ts`):
- Flowise API wrapper with proxy configuration for development
- Attachment processing that converts extracted text to inline content
- Comprehensive error handling for network issues and API failures

### Internationalization
- Multi-language support: Georgian, Russian, English
- Context system in `src/contexts/LanguageContext.tsx`
- Translation files in `src/i18n/` directory
- Specialized character encoding handling for Cyrillic and Georgian scripts

### Component Architecture
**Main Layout**: App component with React Router, Header component, and Stagewise toolbar integration

**Chat Interface**: 
- `ChatBot.tsx` - Main AI chat interface with file upload capabilities
- `AskDoctor.tsx` - Doctor communication interface
- Shared file processing across both interfaces

**Admin System**:
- `Admin.tsx` - Admin dashboard with response management
- `AdminLogin.tsx` - Authentication interface
- `ChatHistory.tsx` - Chat session management

### State Management
- React Context for language/internationalization
- Custom hooks for Flowise API integration (`src/hooks/useFlowiseChat.ts`)
- Local state management with useState/useEffect patterns

## Environment Configuration

### Required Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FLOWISE_API_URL=your_flowise_api_url
```

### Development vs Production
- Development uses Vite proxy for Flowise API (`/api/flowise` → `https://flowise-2-0.onrender.com`)
- Production connects directly to Flowise API
- PDF.js worker is copied from node_modules during build

## Key Integration Points

### Supabase Integration
- Row Level Security (RLS) policies implemented
- PostgreSQL database with comprehensive migration history
- Auth state management with persistent sessions

### Flowise API
- Custom request/response handling for file uploads
- Text content vs file upload differentiation
- Session management and error recovery

### Stagewise Toolbar (Development)
- Visual development tool integration with medical-specific context
- Component detection for React components and medical forms
- Screenshot capabilities with high-resolution output

## File Structure Notes

**Critical Processing Files**:
- `src/utils/pdfTextExtractor.ts` - PDF text extraction with OCR fallback
- `src/utils/ocrExtractor.ts` - Tesseract.js OCR implementation
- `src/utils/fileUpload.ts` - Unified file processing pipeline

**Type Definitions**:
- `src/types/chat.ts` - Core chat and file upload types
- `src/types/admin.ts` - Admin interface types

**API Layer**:
- `src/lib/api/chat.ts` - Flowise API integration
- `src/lib/supabase.ts` - Supabase client configuration

## Development Workflow

When making changes to file processing:
1. Test with various PDF types (text-based, image-based, mixed)
2. Verify multi-language text extraction (Georgian, Russian)
3. Check progress tracking UI updates
4. Test error handling scenarios

When modifying chat functionality:
1. Test both ChatBot and AskDoctor interfaces
2. Verify attachment processing across file types
3. Check session persistence and recovery
4. Test API error scenarios and user feedback