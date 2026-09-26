import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import App from './App'
import { DatasetProvider } from './DatasetContext'
import './styles.css'
import './mobile.css'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Wellnote could not render the dashboard.', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <main className="app-error" role="alert"><h1>The dashboard could not load.</h1><p>No report data has been uploaded or changed. Reload the page; if this continues, check the terminal and browser console.</p><pre>{this.state.error.message}</pre><button onClick={() => window.location.reload()}>Reload dashboard</button></main>
    }
    return this.props.children
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('The Wellnote root element is missing.')
createRoot(root).render(<AppErrorBoundary><DatasetProvider><App /></DatasetProvider></AppErrorBoundary>)
