import { describe, expect, it } from 'vitest'
import { continueActionFor, parseMattFlowCommand } from '../src/commands.ts'

describe('matt-flow command grammar', () => {
  it('keeps quoted Flow titles together', () => {
    expect(parseMattFlowCommand(' start "Checkout API" ')).toEqual({
      verb: 'start', argument: 'Checkout API', tokens: ['start', 'Checkout API'],
    })
  })

  it('does not invent a transition for ambiguous phases', () => {
    expect(continueActionFor('intake')).toBe('start-feature')
    expect(continueActionFor('grilling')).toBeUndefined()
    expect(continueActionFor('reviewing')).toBeUndefined()
  })
})
