import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase.js'

// SSO do AvancerCRM (nicho Odonto): o app-mãe manda a sessão no fragmento
// (#sso_at/#sso_rt — nunca chega ao servidor). Consumimos, logamos e caímos
// direto no backend (/admin), sem tela de login.
async function consumirSso() {
  const h = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
  const th = h.get('sso_th')
  const at = h.get('sso_at'), rt = h.get('sso_rt')
  if (!th && !(at && rt)) return
  try {
    let erro = null
    if (th) {
      // magic link de USO ÚNICO gerado pelo /api/sso-mint do app-mãe: vira uma
      // sessão NOVA e independente (não compartilha refresh token com ninguém)
      ;({ error: erro } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: th }))
    } else {
      ;({ error: erro } = await supabase.auth.setSession({ access_token: at, refresh_token: rt }))
    }
    // SSO grudou: zera a guarda anti-pingue-pongue da PortaDeEntrada
    if (!erro) sessionStorage.removeItem('odonto_bounce')
  } finally {
    // limpa os tokens da barra de endereço e vai pro backend
    window.history.replaceState({}, '', '/admin')
  }
}

consumirSso().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
