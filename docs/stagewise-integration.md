# 🎨 Stagewise Integration - Dr. Khoshtaria Medical Platform

**Visual Vibe Coding for Enhanced Development Workflow**

## 📋 Overview

Stagewise is integrated into the Dr. Khoshtaria medical platform to provide seamless visual development capabilities. This tool connects your frontend UI elements directly to AI agents in your code editor, enabling contextual prompts and rapid development iterations.

## 🚀 Setup Status

### ✅ **Completed Integration:**
- **Package Installation**: `@stagewise/toolbar` installed as dev dependency
- **App Integration**: Initialized in `src/App.tsx` with medical-specific configuration
- **React StrictMode**: Conditionally disabled in development for compatibility
- **Medical Data Attributes**: Added to key components for enhanced detection
- **Configuration**: Custom medical platform settings optimized for healthcare UI

### 🎯 **Next Steps:**
1. **Install Cursor Extension**: Install `stagewise.stagewise-vscode-extension` from VS Code Marketplace
2. **Auto-Setup Alternative**: Use `Cmd + Shift + P` → `setupToolbar` in Cursor
3. **Test Integration**: Select UI elements and send contextual prompts

## 🔧 **Configuration Details**

### **Core Configuration** (`src/App.tsx`)
```typescript
const stagewiseConfig = {
  projectName: 'Dr. Khoshtaria Medical Platform',
  theme: 'dark',
  componentDetection: {
    reactComponents: true,
    customSelectors: [
      '[data-medical-component]',
      '.medical-form',
      '.patient-info', 
      '.chat-interface',
      '.file-upload',
      '.admin-panel',
      '.education-content'
    ]
  },
  contextEnhancement: {
    includeMedicalContext: true,
    includeFormStates: true,
    includeA11yAttributes: true
  },
  screenshot: {
    quality: 0.9,
    format: 'png',
    scale: 2 // High resolution for medical accuracy
  }
};
```

### **Medical Component Detection**
Enhanced component detection for healthcare-specific UI elements:

#### **Data Attributes Added:**
- `data-medical-component="ask-doctor-page"` - Ask Doctor page container
- `data-medical-component="question-form"` - Medical question form
- `data-medical-component="patient-info"` - Patient information section
- `data-medical-component="patient-name-input"` - Patient name input field
- `data-medical-component="patient-email-input"` - Patient email input field
- `data-medical-component="chat-interface"` - Chat bot interface
- `data-medical-component="chat-header"` - Chat header section
- `data-medical-component="chat-messages"` - Chat messages container
- `data-medical-component="chat-welcome"` - Chat welcome screen
- `data-medical-component="chat-input-form"` - Chat input form
- `data-medical-component="chat-input"` - Chat input field
- `data-medical-component="chat-send-button"` - Chat send button
- `data-medical-component="file-upload"` - File upload components

#### **CSS Classes Detected:**
- `.medical-form` - Medical forms and questionnaires
- `.patient-info` - Patient information sections
- `.chat-interface` - Chat and messaging interfaces
- `.file-upload` - File upload and attachment areas
- `.admin-panel` - Administrative interfaces
- `.education-content` - Educational content sections

## 🎯 **Usage Instructions**

### **1. Element Selection**
- **Click any UI element** in your browser to select it
- **Medical components** are automatically detected and highlighted
- **Component hierarchy** is analyzed for context

### **2. Contextual Prompts**
- **Right-click selected elements** to access stagewise menu
- **Send prompts** with full DOM context, screenshots, and metadata
- **AI receives** component type, medical context, and visual information

### **3. Common Use Cases**

#### **Form Enhancements:**
```
"Make this patient information form more accessible with better focus indicators and aria labels"
```

#### **Chat Interface Improvements:**
```
"Add typing indicators and message status icons to this medical chat interface"
```

#### **File Upload Enhancements:**
```
"Improve the file upload progress indicators for medical documents with better visual feedback"
```

#### **Responsive Design:**
```
"Make this medical form responsive for tablet and mobile devices while maintaining readability"
```

## 🏥 **Medical Platform Features**

### **Enhanced Context for Healthcare:**
- **Medical Form States**: Validation states, required fields, error messages
- **Patient Data Privacy**: HIPAA-compliant considerations in prompts
- **Accessibility**: Medical compliance requirements (WCAG 2.1 AA)
- **High-Resolution Capture**: 2x scale screenshots for medical accuracy

### **Component-Specific Enhancements:**
- **Ask Doctor Forms**: Patient information collection and validation
- **Chat Interface**: Medical conversation flow and file sharing
- **Admin Panels**: Healthcare provider tools and dashboards
- **Education Content**: Medical information and resources

## 🔍 **Troubleshooting**

### **Common Issues:**

#### **"Companion anchor already exists" Error:**
- **Cause**: React StrictMode double initialization
- **Solution**: ✅ **Fixed** - Added initialization guards and conditional StrictMode

#### **Extension Not Connecting:**
- **Check**: Multiple Cursor windows open
- **Solution**: Keep only one Cursor window open
- **Alternative**: Restart Cursor and refresh browser

#### **Component Not Detected:**
- **Check**: Element has `data-medical-component` attribute
- **Solution**: Add appropriate medical data attributes
- **Verify**: Component appears in custom selectors list

### **Console Output:**
```
🎨 Stagewise toolbar initialized - Visual vibe coding enabled!
📋 Medical platform features: Form states, A11y attributes, High-res screenshots
```

## 📊 **Development Workflow**

### **Recommended Process:**
1. **Navigate** to page/component needing changes
2. **Select** specific UI element with stagewise
3. **Send contextual prompt** with clear requirements
4. **Review AI suggestions** with full visual context
5. **Apply changes** directly through Cursor
6. **Test immediately** in browser

### **Best Practices:**
- **Be specific** about medical requirements (accessibility, privacy)
- **Include visual context** in prompts (colors, spacing, layout)
- **Mention device targets** (desktop, tablet, mobile)
- **Consider patient experience** in UI modifications

## 🎨 **Visual Enhancement Features**

### **High-Quality Screenshots:**
- **2x resolution** for medical accuracy
- **PNG format** for crisp UI details
- **Full component context** included

### **Medical-Specific Metadata:**
- **Form validation states** captured
- **Accessibility attributes** included
- **Medical context** automatically detected

## 🔮 **Future Enhancements**

### **Planned Features:**
- **Medical Form Validation Plugin**: Automated HIPAA compliance checks
- **Patient Data Privacy Plugin**: Automatic PII detection and masking
- **Accessibility Compliance Plugin**: WCAG 2.1 AA automated testing
- **Medical Terminology Plugin**: Healthcare vocabulary suggestions

## 📞 **Support**

### **Stagewise Resources:**
- **Extension**: VS Code Marketplace - "stagewise.stagewise-vscode-extension"
- **Documentation**: https://stagewise.io/docs
- **Discord**: Community support and discussions

### **Project-Specific:**
- **Configuration File**: `stagewise.config.js` (optional advanced config)
- **Medical Components**: Check `data-medical-component` attributes
- **Development Mode**: Only active in `NODE_ENV=development`

---

**Status**: ✅ **Fully Integrated and Ready for Use**  
**Last Updated**: January 27, 2025  
**Medical Platform Optimization**: Enabled with healthcare-specific enhancements 