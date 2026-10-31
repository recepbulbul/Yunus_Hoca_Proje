import type { Report } from '@/api/types'

export function reportToCsv(report: Report, nameOf: (id: string) => string) {
  const rows = [
    ['agent', 'total_return', 'sharpe', 'max_drawdown', 'trades'],
    ...report.agents.map((a) => [
      nameOf(a.agentId),
      a.totalReturn,
      a.sharpe,
      a.maxDrawdown,
      a.trades,
    ]),
  ]
  return rows
    .map((r) =>
      r
        .map((v) => (typeof v === 'number' ? v.toFixed(6) : `"${v.replaceAll('"', '""')}"`))
        .join(','),
    )
    .join('\n')
}
