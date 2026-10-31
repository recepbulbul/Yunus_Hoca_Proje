import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type DeepPartial,
  type ChartOptions,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts'
import type { Candle } from '@/api/types'

// lightweight-charts paints on canvas and does not read CSS variables, so colours are literal.
const CHART_COLORS = {
  up: '#22c55e',
  down: '#ef4444',
  grid: '#262b38',
  text: '#9aa3b5',
}

const SERIES_PALETTE = [
  '#60a5fa',
  '#f59e0b',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fb923c',
  '#22d3ee',
  '#e879f9',
  '#94a3b8',
]

const baseOptions: DeepPartial<ChartOptions> = {
  autoSize: true,
  layout: {
    background: { type: ColorType.Solid, color: 'transparent' },
    textColor: CHART_COLORS.text,
    attributionLogo: true,
  },
  grid: { vertLines: { color: CHART_COLORS.grid }, horzLines: { color: CHART_COLORS.grid } },
  rightPriceScale: { borderVisible: false },
  timeScale: { borderVisible: false },
}

export interface TradeMarker {
  time: string
  side: 'buy' | 'sell'
  label: string
}

export function CandleChart({
  candles,
  markers,
  height = 360,
  label,
}: {
  candles: Candle[]
  markers: TradeMarker[]
  height?: number
  label: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const chartApi = useRef<IChartApi | null>(null)
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markerApi = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  useEffect(() => {
    const chart = createChart(el.current!, baseOptions)
    chartApi.current = chart
    series.current = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      borderVisible: false,
    })
    markerApi.current = createSeriesMarkers(series.current, [])
    return () => {
      chartApi.current = null
      series.current = null
      markerApi.current = null
      chart.remove()
    }
  }, [])

  useEffect(() => {
    series.current?.setData(candles.map((c) => ({ ...c, time: c.time as Time })))
    chartApi.current?.timeScale().fitContent()
  }, [candles])

  useEffect(() => {
    markerApi.current?.setMarkers(
      markers.map((m): SeriesMarker<Time> => ({
        time: m.time as Time,
        position: m.side === 'buy' ? 'belowBar' : 'aboveBar',
        shape: m.side === 'buy' ? 'arrowUp' : 'arrowDown',
        color: m.side === 'buy' ? CHART_COLORS.up : CHART_COLORS.down,
        text: m.label,
      })),
    )
  }, [markers])

  return <div ref={el} role="img" aria-label={label} style={{ height }} />
}

export interface LineData {
  id: string
  name: string
  points: { time: string; value: number }[]
}

export function MultiLineChart({
  lines,
  height = 260,
  label,
}: {
  lines: LineData[]
  height?: number
  label: string
}) {
  const el = useRef<HTMLDivElement>(null)

  // Rebuild the chart when the (memoised) lines change; simpler than diffing series.
  useEffect(() => {
    const c = createChart(el.current!, baseOptions)
    const created = lines.map((line, i) =>
      c.addSeries(LineSeries, {
        color: SERIES_PALETTE[i % SERIES_PALETTE.length],
        lineWidth: 2,
        title: line.name,
        priceLineVisible: false,
        lastValueVisible: false,
      }),
    )
    created.forEach((s, i) =>
      s.setData(lines[i]!.points.map((p) => ({ time: p.time as Time, value: p.value }))),
    )
    c.timeScale().fitContent()
    return () => c.remove()
  }, [lines])

  return <div ref={el} role="img" aria-label={label} style={{ height }} />
}
