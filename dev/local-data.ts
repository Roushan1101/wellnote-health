import { existsSync, readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { parseDataset } from '../src/lib/dataset'

export function localDataPlugin(filename: string): Plugin {
  return {
    name: 'private-local-development-data',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(filename)
      const reload = (changed: string) => {
        if (changed.replaceAll('\\', '/') === filename.replaceAll('\\', '/')) {
          server.ws.send({ type: 'full-reload' })
        }
      }
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },
    transformIndexHtml(_html, context) {
      if (!context.server || !existsSync(filename)) return []
      const host = context.server.config.server.host
      if (host === true || (typeof host === 'string' && !['127.0.0.1', 'localhost', '::1'].includes(host))) {
        throw new Error('Private health data requires a loopback-only development server. Restart with --host 127.0.0.1 instead of sharing the server on your network.')
      }
      const dataset = parseDataset(readFileSync(filename, 'utf8'))
      return [{
        tag: 'script',
        attrs: { id: 'wellnote-local-data', type: 'application/json' },
        children: JSON.stringify(dataset).replaceAll('<', '\\u003c'),
        injectTo: 'head',
      }]
    },
  }
}
