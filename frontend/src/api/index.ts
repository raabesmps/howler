import { createHttpApi } from './http'
import { createMockApi } from './mock'
import type { HowlerApi } from './types'

/**
 * The API the screens use. It is the real one (the Laravel backend through /api) unless the app is started with
 * VITE_API=mock, which keeps everything in the browser: handy for working on the screens without Docker.
 */
export const api: HowlerApi = import.meta.env.VITE_API === 'mock' ? createMockApi() : createHttpApi(import.meta.env.VITE_API_URL ?? '/api')
