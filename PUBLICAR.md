# Publicar o Minha Oficina

Siga esta ordem:

1. Conta no GitHub
2. Conta no Render
3. Subir o projeto para o GitHub
4. Conectar o GitHub no Render
5. Usar disco persistente
6. Comprar domínio, se quiser

## 1. Criar conta no GitHub

1. Acesse `https://github.com`.
2. Clique em **Sign up**.
3. Crie sua conta e confirme o e-mail.

## 2. Criar conta no Render

1. Acesse `https://render.com`.
2. Clique em **Get Started** ou **Sign Up**.
3. Entre usando sua conta do GitHub, se possível.

## 3. Subir o projeto para o GitHub

O jeito recomendado é instalar o Git:

1. Baixe em `https://git-scm.com/download/win`.
2. Instale usando as opções padrão.
3. Reinicie o terminal ou o computador.
4. Abra o PowerShell nesta pasta do projeto.
5. Rode:

```powershell
git init
git add .
git commit -m "Primeira versão do Minha Oficina"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/minha-oficina.git
git push -u origin main
```

Antes disso, crie no GitHub um repositório vazio chamado `minha-oficina`.

### Alternativa sem instalar Git

Use o upload pelo site:

1. No GitHub, crie um repositório vazio chamado `minha-oficina`.
2. Clique em **Add file > Upload files**.
3. Envie os arquivos e pastas do projeto.
4. Não envie a pasta `data/store.json`, se ela existir.

Arquivos que devem ir:

- `.gitignore`
- `app.js`
- `icon.svg`
- `icon-192.png`
- `icon-512.png`
- `index.html`
- `manifest.webmanifest`
- `package.json`
- `README.md`
- `PUBLICAR.md`
- `render.yaml`
- `server.js`
- `service-worker.js`
- `styles.css`
- pasta `data` com `.gitkeep`

## 4. Conectar o GitHub no Render

1. No Render, clique em **New +**.
2. Escolha **Blueprint**.
3. Conecte o GitHub.
4. Selecione o repositório `minha-oficina`.
5. O Render vai detectar o arquivo `render.yaml`.
6. Confirme a criação do serviço.

## 5. Usar disco persistente

Para testar de graça, o projeto pode usar `plan: free` e salvar dados em
`/tmp/store.json`. Esse modo é temporário: contas e ferramentas podem sumir
quando o Render reiniciar o serviço.

Para produção, volte para um plano pago com disco persistente.

Configuração recomendada para produção:

```yaml
plan: starter
envVars:
  - key: DATA_FILE
    value: /var/data/store.json
disk:
  name: minha-oficina-data
  mountPath: /var/data
  sizeGB: 1
```

E os dados do app ficam em:

```text
/var/data/store.json
```

Importante: disco persistente normalmente exige plano pago. Não use plano
gratuito sem disco para produção, porque contas e ferramentas podem ser
perdidas quando o servidor reiniciar.

## 6. Comprar domínio depois

Depois que o app estiver funcionando no endereço `onrender.com`, você pode:

1. Comprar um domínio em Registro.br, Hostinger, GoDaddy, Cloudflare Registrar
   ou outro serviço.
2. No Render, abrir o serviço.
3. Ir em **Settings > Custom Domains**.
4. Adicionar seu domínio.
5. Configurar o DNS conforme o Render mostrar.

Você pode começar sem domínio. O endereço do Render já funciona com HTTPS e já
permite instalar a PWA no celular.
