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
- Check `supabase/migrations/` for database schema history (20+ migrations showing iterative development)

### Testing and Validation
- No formal test suite configured - test manually with various file types
- Verify OCR functionality with image-based PDFs
- Test multi-language text extraction (Georgian/Russian)

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
- Configuration in `stagewise.config.js` with custom selectors for medical forms

## File Structure Notes

**Critical Processing Files**:
- `src/utils/pdfTextExtractor.ts` - PDF text extraction with OCR fallback
- `src/utils/ocrExtractor.ts` - Tesseract.js OCR implementation  
- `src/utils/imageOcrExtractor.ts` - Image-specific OCR processing
- `src/utils/fileUpload.ts` - Unified file processing pipeline
- `src/utils/georgianEncodingMaps.ts` - Character encoding fixes for Georgian text
- `src/utils/unicodeGeorgianNormalizer.ts` - Unicode normalization utilities
- `src/utils/pdfFontAnalyzer.ts` - Font analysis for text extraction optimization

**Type Definitions**:
- `src/types/chat.ts` - Core chat and file upload types
- `src/types/admin.ts` - Admin interface types

**API Layer**:
- `src/lib/api/chat.ts` - Flowise API integration
- `src/lib/supabase.ts` - Supabase client configuration

**Configuration Files**:
- `vite.config.ts` - Custom PDF.js worker setup, Flowise proxy configuration
- `stagewise.config.js` - Development tool configuration with medical context
- `tailwind.config.js` - Custom dark theme and neon styling
- `tsconfig.*.json` - TypeScript configurations for different environments

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

## Important Development Notes

### Character Encoding Complexity
This codebase handles advanced character encoding scenarios, especially for Georgian and Russian text:
- Georgian text often requires Unicode normalization to display correctly
- Custom encoding maps handle font-specific character mappings in PDFs
- OCR results may need post-processing for multi-language documents

### PDF Processing Optimization
The system is optimized for medical document processing:
- Client-side processing reduces server load and improves performance
- Token usage optimization (95%+ reduction) crucial for AI API costs
- Font analysis helps determine best extraction approach for each PDF

### Proxy Configuration for Development
- Vite proxy handles CORS issues with Flowise API during development
- Production deployment requires direct API configuration
- PDF.js worker must be properly copied during build process