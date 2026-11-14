<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/793ba251-4d91-43de-9fe6-7e09d150bfc3

## Run Locally

**Requisito:** Node.js 22 ou superior.


1. Rode `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha as integrações que deseja testar.
3. Rode `npm run dev` e abra `http://localhost:10000`.
4. Rode `npm run lint`, `npm test` e `npm run build` para validar.

Em produção, rode `npm run build` e inicie com `NODE_ENV=production` e `npm start`.

- **Firebase.** Habilite e-mail/senha e Google, e autorize os domínios do app no Firebase Authentication. Configure credenciais de servidor via Application Default Credentials. O cliente precisa ler somente o próprio perfil em `users/{email}`. Restrinja gravações de benefícios PRO e acesso a `processedPayments` ao servidor.
- **Mercado Pago.** Revogue a credencial antiga e configure `MERCADO_PAGO_ACCESS_TOKEN` com uma nova credencial. Informe o endereço público em `PUBLIC_APP_URL` e valide o fluxo de checkout e a entrega do webhook `/api/webhook` em ambiente de teste. Configure `MERCADO_PAGO_SANDBOX=false` e a credencial de produção para pagamentos reais.
- **Gemini.** Configure `GEMINI_API_KEY` no servidor para habilitar a leitura de cartas por imagem. `GEMINI_MODEL` é opcional.
