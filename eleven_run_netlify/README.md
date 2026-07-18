# Elevens Run — backup completo

Este pacote preserva o estado exato da versão 15 do **Elevens Run**, publicada em 17/07/2026.

Commit de origem: `4d6b0f0132400896207579d54c5e1598d82728ec`

## Conteúdo

- Código-fonte completo em `app/`, `worker/`, `build/` e `db/`.
- Personagem principal e todas as poses/animações.
- Versão da formanda com beca e canudo.
- Dois fotógrafos da cena final.
- Cenários de Campus, Laboratório, Hospital e Formatura.
- Moeda Eleven e todos os obstáculos.
- Fontes locais e demais arquivos visuais.
- Música e efeitos sonoros procedurais no código do jogo (`app/page.tsx`). Não existem arquivos de áudio externos nesta versão.
- Configurações, scripts, testes, `package.json` e `package-lock.json`.

## Requisitos

- Node.js 22.13.0 ou superior.
- npm, fornecido junto com o Node.js.

## Executar localmente

1. Extraia `Elevens-Run-Backup.zip`.
2. Abra o terminal dentro da pasta extraída.
3. Instale as dependências:

```bash
npm install
```

4. Inicie o jogo:

```bash
npm run dev
```

5. Abra no navegador o endereço exibido pelo terminal, normalmente `http://localhost:3000` ou `http://localhost:5173`.

O som é liberado pelo navegador após clicar em **INICIAR JORNADA**. Verifique também se o botão de áudio no topo está ativado.

## Gerar versão de produção

```bash
npm run build
npm run start
```

## Observações

- Nenhuma chave de API ou variável de ambiente é necessária para executar o jogo atual.
- As dependências e versões exatas estão registradas em `package.json` e `package-lock.json`.
- A pasta `node_modules` não acompanha o pacote porque é recriada fielmente pelo comando `npm install` usando o arquivo de lock.
- Consulte `ITENS_NAO_EXPORTADOS.md` para o registro da exportação.
