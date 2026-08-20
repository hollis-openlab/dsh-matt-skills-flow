import type { Domain, KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { Context } from '@deepseek-ai/cordis'
import { mattSkillsFlowDomain, type FlowId, type FlowRecord } from './domain.ts'

export class FlowRepository {
  private domain: Domain<typeof mattSkillsFlowDomain> | undefined
  private table: KvTable<FlowId, FlowRecord> | undefined

  constructor(private readonly ctx: Context) {}

  async open(): Promise<void> {
    this.domain = await this.ctx.storageDomain.open(mattSkillsFlowDomain)
    this.table = this.domain.table('flows')
    this.ctx.effect(() => () => { void this.domain?.close() }, 'matt-skills-flow: storage close')
  }

  list(): FlowRecord[] {
    return [...this.requireTable().entries()].map(([, flow]) => flow)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  get(id: FlowId): FlowRecord | undefined {
    return this.requireTable().get(id)
  }

  async create(flow: FlowRecord): Promise<FlowRecord> {
    const table = this.requireTable()
    if (table.get(flow.id) !== undefined) throw new Error(`flow '${flow.id}' already exists`)
    await table.put(flow.id, flow)
    return flow
  }

  async update(id: FlowId, expectedRevision: number, apply: (flow: FlowRecord) => FlowRecord): Promise<FlowRecord> {
    const table = this.requireTable()
    return await table.update(id, current => {
      if (current.revision !== expectedRevision) {
        throw new Error(`FLOW_STALE_REVISION: expected ${expectedRevision}, current ${current.revision}`)
      }
      const next = apply(current)
      if (next.id !== current.id || next.revision !== current.revision + 1) {
        throw new Error(`invalid flow revision transition for '${id}'`)
      }
      return next
    })
  }

  private requireTable(): KvTable<FlowId, FlowRecord> {
    if (this.table === undefined) throw new Error('matt-skills-flow storage is not ready')
    return this.table
  }
}
