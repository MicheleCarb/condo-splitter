import { AppConfig } from '../types'
import { sampleConfig } from '../config/sampleConfig'

const cloneConfig = () => JSON.parse(JSON.stringify(sampleConfig)) as AppConfig

const STORAGE_KEY = 'condo-splitter-config'
const IS_EXAMPLE_KEY = 'condo-splitter-is-example'

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

export function isExampleConfig(): boolean {
  if (typeof localStorage === 'undefined') return true
  const stored = localStorage.getItem(IS_EXAMPLE_KEY)
  // If flag doesn't exist, check if config exists - if no config, it's example
  if (stored === null) {
    const hasConfig = localStorage.getItem(STORAGE_KEY) !== null
    return !hasConfig
  }
  return stored === 'true'
}

export function markConfigAsReal() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(IS_EXAMPLE_KEY, 'false')
  } catch (error) {
    console.warn('Unable to mark config as real', error)
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
