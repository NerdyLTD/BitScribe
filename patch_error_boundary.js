const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/main.tsx', 'utf8');

const errorBoundary = `
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
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

if (!file.includes('ErrorBoundary')) {
  file = file.replace('import App from "./App";', 'import App from "./App";\\n' + errorBoundary);
  file = file.replace('<App />', '<ErrorBoundary><App /></ErrorBoundary>');
  fs.writeFileSync('apps/steward/src/main.tsx', file);
}
