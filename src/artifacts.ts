import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'

export interface ArtifactRecord {
  readonly id: string
  readonly kind: 'decision' | 'ticket' | 'lane' | 'packet' | 'review' | 'spec' | 'export' | 'acceptance'
  readonly mediaType: string
  readonly sha256: string
  readonly size: number
  readonly relativePath: string
  readonly createdAt: number
}

export interface ArtifactWrite {
  readonly kind: ArtifactRecord['kind']
  readonly mediaType: string
  readonly bytes: Uint8Array
}

/** Content-addressed store owned by one plugin installation. */
export class ArtifactStore {
  readonly root: string

  constructor(root: string, private readonly maxBytes: number) {
    const resolved = resolve(root)
    if (!isAbsolute(root) || resolved === '/' || resolved === homedir() || resolved === resolve(dshHomePath())) {
      throw new Error('ARTIFACT_ROOT_INVALID: choose a dedicated absolute plugin-owned directory')
    }
    this.root = resolved
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('ARTIFACT_LIMIT_INVALID: maxArtifactBytes must be positive')
  }

  /** Write bytes atomically and return immutable metadata. */
  async put(input: ArtifactWrite): Promise<ArtifactRecord> {
    if (input.bytes.byteLength > this.maxBytes) throw new Error(`ARTIFACT_TOO_LARGE: ${input.bytes.byteLength} > ${this.maxBytes}`)
    const bytes = Buffer.from(input.bytes)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const relativePath = join('sha256', sha256.slice(0, 2), sha256)
    const target = this.resolveOwned(relativePath)
    await mkdir(dirname(target), { recursive: true })
    try {
      const existing = await readFile(target)
      if (!existing.equals(bytes)) throw new Error(`ARTIFACT_CORRUPT: digest collision at ${relativePath}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const temporary = `${target}.tmp-${randomUUID()}`
      await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 })
      await rename(temporary, target)
    }
    const size = (await stat(target)).size
    return { id: `artifact-${sha256.slice(0, 16)}`, kind: input.kind, mediaType: input.mediaType, sha256, size, relativePath, createdAt: Date.now() }
  }

  /** Read one exact artifact after validating that its path stays owned. */
  async read(record: Pick<ArtifactRecord, 'relativePath' | 'sha256'>): Promise<Buffer> {
    const bytes = await readFile(this.resolveOwned(record.relativePath))
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (actual !== record.sha256) throw new Error(`ARTIFACT_CORRUPT: ${record.relativePath}`)
    return bytes
  }

  private resolveOwned(relativePath: string): string {
    const target = resolve(this.root, relativePath)
    const containment = relative(this.root, target)
    if (containment.startsWith('..') || containment.includes(`..${requireSeparator()}`)) throw new Error('ARTIFACT_PATH_ESCAPE: artifact path leaves owned root')
    return target
  }
}

function requireSeparator(): string {
  return process.platform === 'win32' ? '\\' : '/'
}
