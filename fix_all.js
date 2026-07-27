const fs = require('fs');

// 1. Fix core-types/index.ts
let ct = fs.readFileSync('packages/core-types/index.ts', 'utf8');
if (!ct.includes('diagnosticLoggingEnabled?: boolean;')) {
    ct = ct.replace('  useCleanNonLatinTags?: boolean;', '  useCleanNonLatinTags?: boolean;\\n  diagnosticLoggingEnabled?: boolean;');
    fs.writeFileSync('packages/core-types/index.ts', ct);
}

// 2. Fix main.tsx
let main = fs.readFileSync('apps/steward/src/main.tsx', 'utf8');
if (!main.includes('class ErrorBoundary extends React.Component')) {
    const errorBoundary = `
import React from 'react';
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any, info: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'black', height: '100vh', boxSizing: 'border-box' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
`;
    // main.tsx has import App from './App.tsx' which has no default export? No wait, it said "has no default export"?
    // Oh, I accidentally removed export default App?
    main = main.replace("import App from './App.tsx';", errorBoundary + "\\nimport App from './App';");
    fs.writeFileSync('apps/steward/src/main.tsx', main);
}

// 3. Fix App.tsx missing default export
let app = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');
if (!app.includes('export default App;')) {
    app += '\\nexport default App;';
    fs.writeFileSync('apps/steward/src/App.tsx', app);
}

