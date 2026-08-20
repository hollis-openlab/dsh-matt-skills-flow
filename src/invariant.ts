import { flowRecordSchema, FLOW_PHASES } from './domain.ts'

export { flowRecordSchema, FLOW_PHASES }

export function assertFlowRecord(value: unknown): void {
  flowRecordSchema.parse(value)
}
