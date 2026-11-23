import { createApp } from 'vue'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/600.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import { router } from './router'
import { initMonitoring } from './monitoring'

const app = createApp(App).use(router)
// error monitoring: a no-op (and nothing is downloaded) unless the build has a Sentry DSN; see monitoring.ts
void initMonitoring(app)
app.mount('#app')
