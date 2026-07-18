# Elevens Run — versão pronta para Netlify

Esta versão foi adaptada do backup original para funcionar como um site estático Vite/React.
Ela não depende de scripts `.sh`, permissões Linux, Cloudflare Workers ou variáveis externas.

## Publicar no Netlify pelo GitHub

1. Extraia o ZIP.
2. Envie a pasta `eleven_run_netlify` inteira ao GitHub, preservando as subpastas.
3. No Netlify, importe o repositório.
4. Se a pasta estiver na raiz do repositório, deixe **Base directory** vazio.
5. Se ela estiver dentro de outra pasta, informe o nome dessa pasta em **Base directory**.
6. Use:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. Clique em Deploy.

O arquivo `netlify.toml` já contém essas configurações, então o Netlify normalmente preencherá tudo automaticamente.

## Executar localmente

```bash
npm install
npm run dev
```
