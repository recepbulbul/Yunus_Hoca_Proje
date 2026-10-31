import { Download, Play, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { api } from '@/api/client'
import { useExperiments, useStartExperiment } from '@/api/queries'
import { CONDITION_LABELS } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { PageTitle, StatusBadge } from '@/components/common'
import { downloadFile } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, ErrorState, Skeleton, Table } from '@/components/ui/primitives'
import { formatDate } from '@/lib/utils'

export function ExperimentsPage() {
  const { user } = useAuth()
  const { data, isPending, error, refetch } = useExperiments()
  const start = useStartExperiment()
  const isResearcher = user?.role === 'researcher'

  const exportYaml = async (id: string) =>
    downloadFile(`${id}.yaml`, await api.text(`/experiments/${id}/export.yaml`), 'application/yaml')

  return (
    <>
      <PageTitle
        title="Deneyler"
        subtitle="Replay ve canlı paper-trading deneyleri. Satıra tıklayarak canlı borsa ekranını açın."
        actions={
          isResearcher && (
            <Link to="/experiments/new" className={buttonVariants()}>
              <Plus /> Yeni deney
            </Link>
          )
        }
      />
      <Card>
        {isPending ? (
          <Skeleton className="h-48" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Koşul</th>
                <th>Mod</th>
                <th>Dönem</th>
                <th>Seed</th>
                <th>Durum</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.status === 'draft' ? (
                      <span className="font-medium">{e.name}</span>
                    ) : (
                      <Link
                        to={`/experiments/${e.id}/live`}
                        className="font-medium hover:underline"
                      >
                        {e.name}
                      </Link>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {e.assets.join(' · ')} · {e.agentIds.length} ajan
                    </div>
                  </td>
                  <td className="text-xs">{CONDITION_LABELS[e.condition]}</td>
                  <td className="text-xs">{e.mode === 'live' ? 'Canlı (paper)' : 'Replay'}</td>
                  <td className="text-xs whitespace-nowrap">
                    {formatDate(e.startDate)} – {e.endDate ? formatDate(e.endDate) : 'devam ediyor'}
                  </td>
                  <td className="font-mono text-xs">{e.seed}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {isResearcher && e.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={start.isPending}
                          onClick={() => start.mutate(e.id)}
                        >
                          <Play /> Başlat
                        </Button>
                      )}
                      {e.status !== 'draft' && (
                        <Link
                          to={`/experiments/${e.id}/report`}
                          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        >
                          Rapor
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`${e.name} YAML olarak indir`}
                        onClick={() => void exportYaml(e.id)}
                      >
                        <Download /> YAML
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
