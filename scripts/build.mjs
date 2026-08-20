#!/usr/bin/env node
import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const lib = join(ROOT, 'lib')
await mkdir(lib, { recursive: true })
await mkdir(join(lib, 'types'), { recursive: true })

await build({ bundle: true, entryPoints: [join(ROOT, 'src', 'index.ts')], format: 'esm', outfile: join(lib, 'index.js'), platform: 'node', target: 'es2022' })
await build({ bundle: true, entryPoints: [join(ROOT, 'src', 'remote.ts')], format: 'esm', outfile: join(lib, 'typert.remote-client.js'), platform: 'node', target: 'es2022' })
await build({ bundle: true, entryPoints: [join(ROOT, 'src', 'invariant.ts')], format: 'esm', outfile: join(lib, 'invariant.js'), platform: 'node', target: 'es2022' })

await writeFile(join(lib, 'typert.host.js'), [
  'import { TYPERT_REMOTE } from "./typert.remote-client.js";',
  'export const TYPERT = { package: TYPERT_REMOTE.package, face: "host", schemas: [], invocations: TYPERT_REMOTE.descriptors, model: { services: [], events: [], objects: [] } };',
  'export default TYPERT;',
  '',
].join('\n'))
await writeFile(join(lib, 'types', 'typert.host.d.ts'), 'export declare const TYPERT: unknown;\nexport default TYPERT;\n')

const temporaryClient = join(lib, '_client.js')
await build({
  bundle: true,
  define: { 'import.meta.env': JSON.stringify({ MODE: 'production' }), 'import.meta.env.MODE': JSON.stringify('production'), 'process.env.NODE_ENV': JSON.stringify('production') },
  entryPoints: [join(ROOT, 'src', 'client', 'index.ts')],
  external: ['react'],
  format: 'cjs',
  minify: true,
  outfile: temporaryClient,
  platform: 'browser',
  target: 'es2020',
})
const clientSource = (await readFile(temporaryClient, 'utf8')).replace(/[ \t]+$/gm, '').trimEnd()
await rm(temporaryClient)
await writeFile(join(lib, 'client.js'), [
  'window.__ModuleLoader__.load({',
  `  id: ${JSON.stringify(pkg.name)},`,
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  clientSource,
  '    return module.exports;',
  '  },',
  '});',
  '',
].join('\n'))

const host = await import(join(lib, 'index.js'))
if (typeof host.default !== 'function' || host.default.name !== 'MattSkillsFlowService') throw new Error('host half does not expose MattSkillsFlowService')
const remote = await import(join(lib, 'typert.remote-client.js'))
if (remote.TYPERT_REMOTE.descriptors.length !== 27) throw new Error('Remote descriptor count is not twenty-seven')
new Function(await readFile(join(lib, 'client.js'), 'utf8'))
console.log(`built ${pkg.name}: host, invariant, remote, and client halves`)
