// 🎨 Stagewise Configuration for Dr. Khoshtaria Medical Platform
// Visual vibe coding configuration

export default {
  // Project identification
  projectName: 'Dr. Khoshtaria Medical Platform',
  
  // Toolbar appearance
  theme: 'dark',
  
  // Component detection settings
  componentDetection: {
    // Enhanced detection for React components
    reactComponents: true,
    // Medical-specific component classes
    customSelectors: [
      '[data-medical-component]',
      '.medical-form',
      '.patient-info',
      '.chat-interface',
      '.file-upload'
    ]
  },
  
  // Context enhancement for medical platform
  contextEnhancement: {
    // Include medical-specific metadata
    includeMedicalContext: true,
    // Capture form validation states
    includeFormStates: true,
    // Include accessibility attributes for medical compliance
    includeA11yAttributes: true
  },
  
  // Screenshot settings optimized for medical UI
  screenshot: {
    quality: 0.9,
    format: 'png',
    // Capture higher resolution for medical accuracy
    scale: 2
  },
  
  // Development environment specific settings
  development: {
    // Enhanced logging for debugging
    verbose: true,
    // Auto-detect component boundaries
    highlightComponents: true
  },
  
  // Medical platform specific plugins
  plugins: [
    // Future: Medical form validation plugin
    // Future: Patient data privacy plugin
    // Future: Accessibility compliance plugin
  ]
}; 