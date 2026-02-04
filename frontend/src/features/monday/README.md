# Monday App Modernization - Dependencies

## Required NPM Packages

To complete the modernization, please install the following dependencies:

```bash
npm install zustand @tanstack/react-query framer-motion react-virtual @headlessui/react cmdk date-fns
```

### Package Details

- **zustand** (^4.5.0) - Lightweight state management
- **@tanstack/react-query** (^5.17.0) - Server state management with caching
- **framer-motion** (^11.0.0) - Animation library
- **react-virtual** (^2.10.4) - Virtualization for large lists
- **@headlessui/react** (^1.7.18) - Unstyled, accessible UI components
- **cmdk** (^0.2.0) - Command palette (Cmd+K)
- **date-fns** (^3.0.0) - Date formatting utilities

## Installation Instructions

### Windows PowerShell

If you encounter execution policy errors, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the npm install command above.

### Alternative: Manual Installation

If npm commands still don't work, you can:

1. Open Command Prompt (cmd.exe) instead of PowerShell
2. Navigate to the frontend directory
3. Run the npm install command

## Current Progress

✅ Directory structure created
✅ Design tokens defined
✅ Zustand store implemented
✅ Custom hooks created
✅ Shared components built
⏳ Dependencies need to be installed
⏳ Layout components in progress

## Next Steps

1. Install dependencies
2. Create layout components
3. Build board components
4. Implement item display components
