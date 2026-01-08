import { createContext, useContext, useMemo, useState } from 'react'
import { AppConfig } from '../types'
import { loadConfig as load, resetToSample, saveConfig as persist } from '../lib/storage'
import { sampleConfig } from '../config/sampleConfig'

type ConfigContextValue = {
  config: AppConfig
  updateConfig: (next: AppConfig) => void
  resetConfig: () => void
  importConfig: (next: AppConfig) => void
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(load())

  const updateConfig = (next: AppConfig) => {
    setConfig(next)
    persist(next)
  }

  const resetConfig = () => {
    const next = resetToSample()
    setConfig(next)
  }

  const importConfig = (next: AppConfig) => {
    const merged: AppConfig = {
      ...sampleConfig,
      ...next,
      condomini: next.condomini ?? sampleConfig.condomini,
      tables: next.tables ?? sampleConfig.tables,
      billTypes: next.billTypes ?? sampleConfig.billTypes,
    }
    updateConfig(merged)
  }

  const value = useMemo(
    () => ({ config, updateConfig, resetConfig, importConfig }),
    [config],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}
