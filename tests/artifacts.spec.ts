import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ArtifactStore } from '../src/artifacts.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('ArtifactStore', () => {
  it('writes content-addressed bytes and reads them back', async () => {
    const root = await mkdtemp(join(tmpdir(), 'matt-flow-artifacts-'))
    roots.push(root)
    const store = new ArtifactStore(root, 1024)
    const first = await store.put({ kind: 'decision', mediaType: 'application/json', bytes: Buffer.from('{"answer":"yes"}') })
    const second = await store.put({ kind: 'decision', mediaType: 'application/json', bytes: Buffer.from('{"answer":"yes"}') })
    expect(second.sha256).toBe(first.sha256)
    expect(await store.read(first)).toEqual(Buffer.from('{"answer":"yes"}'))
  })

  it('rejects oversized content and unsafe roots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'matt-flow-artifacts-'))
    roots.push(root)
    const store = new ArtifactStore(root, 2)
    await expect(store.put({ kind: 'ticket', mediaType: 'text/plain', bytes: Buffer.from('too long') })).rejects.toThrow('ARTIFACT_TOO_LARGE')
    expect(() => new ArtifactStore('/', 2)).toThrow('ARTIFACT_ROOT_INVALID')
  })

  it('redacts credential-shaped values before hashing and persistence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'matt-flow-artifacts-'))
    roots.push(root)
    const store = new ArtifactStore(root, 1024)
    const artifact = await store.put({ kind: 'review', mediaType: 'application/json', bytes: Buffer.from('{"DEEPSEEK_API_KEY":"sk-secret-value-1234567890","note":"ok"}') })
    const stored = (await store.read(artifact)).toString('utf8')
    expect(stored).toContain('[REDACTED]')
    expect(stored).not.toContain('sk-secret-value-1234567890')
  })
})
