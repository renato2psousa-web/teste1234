# Itens não exportados na versão Netlify

Nenhum asset do jogo foi removido.

Foram excluídos apenas diretórios gerados ou temporários (`node_modules`, `dist`, caches) porque o Netlify os recria durante o deploy.

Os arquivos específicos do ambiente original (Cloudflare/Work) foram mantidos como referência, mas o deploy Netlify utiliza `index.html`, `src/main.tsx`, `vite.config.ts`, `package.json` e `netlify.toml`.
