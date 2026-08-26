import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'lightningcss'
import { defineConfig, type Plugin } from 'tsdown'

const PACKAGE_NAME = 'dsh-maze'
const CSS_PREFIX = '\0dsh-css:'
const CSS_SUFFIX = '.mjs'
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
] as const

function sourceAssetPath(source: string, importer: string): string {
  const emitted = resolvePath(dirname(importer), source)
  if (existsSync(emitted)) return emitted
  return resolvePath(dirname(importer), source)
}

/**
 * Inline the self-contained maze upload page (src/client/maze-upload.html) as
 * a string for <iframe srcDoc>. The fzstd UMD build is spliced into the page's
 * placeholder script so .jsonl.zstd uploads decompress in browsers whose
 * DecompressionStream lacks 'zstd'.
 * The shared verdict module (src/client/verdict.js, also imported by
 * live-data.ts) is spliced into the page's verdict placeholder with its
 * `export ` prefixes stripped, so both render paths judge with one source.
 */
function inlineMazeHtmlPlugin(): Plugin {
  const MAZE_VIRTUAL = '\0trace-compare:maze-upload-html'
  const file = fileURLToPath(new URL('./src/client/maze-upload.html', import.meta.url))
  const fzstdUmd = fileURLToPath(new URL('./node_modules/fzstd/umd/index.js', import.meta.url))
  const verdictFile = fileURLToPath(new URL('./src/client/verdict.js', import.meta.url))
  return {
    name: 'dsh-trace-compare-inline-maze-html',
    resolveId(source: string) {
      return source === 'virtual:maze-upload-html' ? MAZE_VIRTUAL : null
    },
    async load(id: string) {
      if (id !== MAZE_VIRTUAL) return null
      this.addWatchFile(file)
      this.addWatchFile(fzstdUmd)
      this.addWatchFile(verdictFile)
      const raw = await readFile(file, 'utf8')
      const verdictJs = (await readFile(verdictFile, 'utf8')).replace(/^export /gm, '')
      const withVerdict = raw.replace('/*__VERDICT__*/', () => verdictJs)
      if (withVerdict === raw) throw new Error('maze-upload.html is missing the /*__VERDICT__*/ placeholder')
      const html = withVerdict.replace('/*__FZSTD_UMD__*/', await readFile(fzstdUmd, 'utf8'))
      if (html === withVerdict) throw new Error('maze-upload.html is missing the /*__FZSTD_UMD__*/ placeholder')
      // < keeps "</script>" from terminating the loaded client.js bundle.
      return `export default ${JSON.stringify(html).replace(/</g, '\\u003c')}`
    },
  }
}

/** Compile `x.module.css` imports with lightningcss: hashed class map + self-injecting <style> tag. */
function cssModulesInlinePlugin(): Plugin {
  return {
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const absolute = importer === undefined ? source : sourceAssetPath(source, importer)
      return CSS_PREFIX + absolute + CSS_SUFFIX
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_PREFIX)) return null
      const fileId = virtualId.slice(CSS_PREFIX.length, -CSS_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const result = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      for (const [local, value] of Object.entries(result.exports ?? {})) classMap[local] = value.name
      return [
        `const css = ${JSON.stringify(result.code.toString())};`,
        `const tagId = ${JSON.stringify(`${PACKAGE_NAME}/${basename(fileId)}`)};`,
        "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {",
        "  const tag = document.createElement('style');",
        `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_NAME)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }
}

export default defineConfig({
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...EXTERNALS],
  noExternal: (id: string) => EXTERNALS.includes(id as typeof EXTERNALS[number]) ? undefined : true,
  plugins: [cssModulesInlinePlugin(), inlineMazeHtmlPlugin()],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
