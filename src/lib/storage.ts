import { AppConfig } from '../types'
import { sampleConfig } from '../config/sampleConfig'

const cloneConfig = () => JSON.parse(JSON.stringify(sampleConfig)) as AppConfig

const STORAGE_KEY = 'condo-splitter-config'

export function loadConfig(): AppConfig {
  if (typeof localStorage === 'undefined') return cloneConfig()

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneConfig()
    const parsed = JSON.parse(raw) as AppConfig
    return parsed
  } catch (error) {
    console.warn('Config load failed, using sample config', error)
    return cloneConfig()
  }
}

export function saveConfig(config: AppConfig) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Unable to save config', error)
  }
}

export function resetToSample(): AppConfig {
  const next = cloneConfig()
  saveConfig(next)
  return next
}
