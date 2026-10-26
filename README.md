# Leva Eu — MVP 0 (landing + lista de espera)

Página única, sem backend. Serve como smoke test (CP3) e porta de entrada do MVP concierge (Sprint 2).

## Publicar (GitHub Pages)
1. No GitHub: Settings → Pages → Source: `main` / root.
2. O link público será `https://kaiomeireles.github.io/sprint2/`. Cole nos slides 18, 20, 21 e 23.

## Configurar (`config.js`)
- `whatsapp`: número que recebe os pedidos (DDI + DDD + número, só dígitos).
- `formAction` e `entries` (opcional): Google Forms para guardar a lista em planilha.
  Sem isso, o botão "Quero entrar na lista" abre o WhatsApp com o cadastro pronto.
- `ga4` (opcional): ID do Google Analytics 4 para contar visitantes e cadastros.

## Teste A/B/C do CP2
A página sorteia uma das 3 frases e lembra a escolha do visitante.
Para forçar uma: `?v=A`, `?v=B` ou `?v=C`. Para medir o canal: `?utm_source=instagram`.
Eventos enviados ao GA4: `cta_topo`, `cadastro_lista`, `cta_whatsapp` (com `variante` e `origem`).

## Números do slide 20
Visitantes = usuários do GA4 no período · Conversões = linhas na planilha (ou conversas no WhatsApp) · Taxa = conversões / visitantes.

## O que a página NÃO faz
Pagamento, despacho automático, app e login. Tudo isso é manual (concierge) nesta fase.
