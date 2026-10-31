import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type {
  Agent,
  AgentDetail,
  Experiment,
  ExperimentCreate,
  ForumMessage,
  Memory,
  Regime,
  Report,
  Timeline,
  TrustHistoryPoint,
  TrustScore,
} from './types'

export const keys = {
  agents: ['agents'] as const,
  experiments: ['experiments'] as const,
  experiment: (id: string) => ['experiments', id] as const,
  timeline: (id: string) => ['experiments', id, 'timeline'] as const,
  agent: (id: string, agentId: string) => ['experiments', id, 'agents', agentId] as const,
  forum: (id: string) => ['experiments', id, 'forum'] as const,
  memories: (id: string, f: MemoryFilter) => ['experiments', id, 'memories', f] as const,
  report: (id: string) => ['experiments', id, 'report'] as const,
}

export const useAgents = () =>
  useQuery({
    queryKey: keys.agents,
    queryFn: () => api.get<Agent[]>('/agents'),
    staleTime: Infinity,
  })

export const useExperiments = () =>
  useQuery({ queryKey: keys.experiments, queryFn: () => api.get<Experiment[]>('/experiments') })

export const useExperiment = (id: string) =>
  useQuery({
    queryKey: keys.experiment(id),
    queryFn: () => api.get<Experiment>(`/experiments/${id}`),
  })

export const useTimeline = (id: string, enabled = true) =>
  useQuery({
    queryKey: keys.timeline(id),
    queryFn: () => api.get<Timeline>(`/experiments/${id}/timeline`),
    enabled,
    staleTime: Infinity,
  })

export const useAgentDetail = (id: string, agentId: string) =>
  useQuery({
    queryKey: keys.agent(id, agentId),
    queryFn: () => api.get<AgentDetail>(`/experiments/${id}/agents/${agentId}`),
  })

export interface ForumData {
  messages: ForumMessage[]
  trust: TrustScore[]
  trustHistory: TrustHistoryPoint[]
}

export const useForum = (id: string) =>
  useQuery({
    queryKey: keys.forum(id),
    queryFn: () => api.get<ForumData>(`/experiments/${id}/forum`),
  })

export interface MemoryFilter {
  regime?: Regime | ''
  agent?: string
  q?: string
}

export const useMemories = (id: string, filter: MemoryFilter) =>
  useQuery({
    queryKey: keys.memories(id, filter),
    queryFn: () => {
      const qs = new URLSearchParams(
        Object.entries(filter).filter((e): e is [string, string] => Boolean(e[1])),
      )
      return api.get<Memory[]>(`/experiments/${id}/memories?${qs}`)
    },
    placeholderData: (prev) => prev,
  })

export const useReport = (id: string) =>
  useQuery({
    queryKey: keys.report(id),
    queryFn: () => api.get<Report>(`/experiments/${id}/report`),
  })

export const useCreateExperiment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ExperimentCreate) => api.post<Experiment>('/experiments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.experiments }),
  })
}

export const useStartExperiment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Experiment>(`/experiments/${id}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.experiments }),
  })
}
