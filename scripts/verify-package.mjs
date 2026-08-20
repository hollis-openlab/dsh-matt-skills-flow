#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const required = ['lib/index.js', 'lib/client.js', 'lib/invariant.js', 'lib/typert.host.js', 'lib/typert.remote-client.js', 'cordis.patch.yml']
for (const relative of required) await access(join(root, relative))
const client = await readFile(join(root, 'lib/client.js'), 'utf8')
if (client.includes('/Users/heng/') || client.includes('dsh-runtime-xray')) throw new Error('client artifact contains a development path or unrelated plugin identity')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
if (pkg.private === true) throw new Error('public package must not remain private')
console.log(`verified package ${pkg.name}`)
