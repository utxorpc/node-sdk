import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cardano } from '@utxorpc/spec'

const dir = path.join(__dirname, 'vectors', 'cardano')

const rows = readFileSync(path.join(dir, 'vectors.tsv'), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => line.split('\t'))
  .map(([name, , , slot, hash, txCount, firstTxHash]) => ({ name, slot, hash, txCount, firstTxHash }))

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString('hex')

describe('cardano vectors', () => {
  it.each(rows)('decodes $name', ({ name, slot, hash, txCount, firstTxHash }) => {
    const raw = readFileSync(path.join(dir, 'v1alpha', `${name}.pb`))

    const block = cardano.Block.fromBinary(raw)
    const txs = block.body?.tx ?? []

    expect(block.header?.slot.toString()).toBe(slot)
    expect(hex(block.header!.hash)).toBe(hash)
    expect(txs.length).toBe(Number(txCount))
    if (firstTxHash !== '-') expect(hex(txs[0].hash)).toBe(firstTxHash)
    expect(Buffer.from(block.toBinary())).toEqual(raw)
  })
})
