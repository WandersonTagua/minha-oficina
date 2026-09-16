# Minha Oficina

PWA multiusuário para mecânicos cadastrarem ferramentas, consultarem o
inventário pelo celular ou computador e gerarem relatórios em PDF.

## Executar localmente

É necessário ter o Node.js 20 ou mais recente.

```powershell
node server.js
```

Depois, abra `http://localhost:4173`.

Para criar o primeiro dono da plataforma, configure a variável:

```powershell
$env:OWNER_SETUP_KEY="um-codigo-secreto"
node server.js
```

No cadastro inicial, informe esse mesmo código no campo **Código do dono**.

## Recursos

- Cadastro e login de usuários
- Senhas protegidas com `scrypt`
- Inventário separado por usuário
- Cadastro, edição e exclusão de ferramentas
- Foto, data de aquisição, valor, categoria e número de série
- Busca e filtro por categoria
- Dados do mecânico
- Relatório formatado para imprimir ou salvar em PDF
- Painel público para TV com fila, aviso e vídeos
- Upload de vídeos do computador do gestor e links do YouTube
- Controle para reproduzir vídeos com som ou mudo
- Botão de tela cheia no painel da TV
- PWA instalável no celular e computador
- Cache da interface para abertura básica sem conexão
- Troca da própria senha e redefinição administrativa pelo gestor
- Exportação manual de segurança por oficina ou da plataforma
- Termos de uso e política de privacidade acessíveis no app
- Testes automáticos dos fluxos críticos

## Instalar no celular

O app precisa estar publicado com HTTPS.

- Android/Chrome: abra o site e toque em **Instalar aplicativo**
- iPhone/Safari: abra o site, toque em **Compartilhar** e depois em
  **Adicionar à Tela de Início**

Quando instalado, o app abre sem a barra normal do navegador.

## Publicar online com Render

O arquivo `render.yaml` configura um serviço web Node.js para testes no plano
gratuito. Nesse plano, os arquivos são temporários e podem ser apagados em
reinicializações ou novos deploys.

1. Envie este projeto para um repositório no GitHub.
2. No Render, escolha **New > Blueprint**.
3. Conecte o repositório e aplique o Blueprint.
4. Ao finalizar, o Render fornecerá um endereço HTTPS instalável como PWA.

Antes do uso com clientes reais, configure disco persistente ou banco de dados
para não perder contas, serviços, fotos e inventários quando o servidor reiniciar.

Antes de criar o primeiro usuário em produção, altere a variável
`OWNER_SETUP_KEY` no Render para um código secreto seu. Sem esse código, ninguém
consegue virar dono da plataforma.

### Consulta de placa

Para preencher marca, modelo, ano e cor pela placa usando a API Brasil, configure
estas variáveis no Render:

```text
VEHICLE_API_PROVIDER=apibrasil
VEHICLE_API_URL=https://gateway.apibrasil.io/api/v2/vehicles/dados
VEHICLE_API_KEY=sua-chave-da-api-brasil
```

Não salve a chave no GitHub. Se a consulta falhar ou a placa não for encontrada,
o aceite do serviço continua permitindo preenchimento manual.

### Notificações estáveis

Gere um par de chaves uma única vez:

```powershell
npm run generate:vapid
```

Cadastre os dois valores apresentados no ambiente do Render:

```text
VAPID_PUBLIC_KEY=valor-gerado
VAPID_PRIVATE_KEY=valor-gerado
```

Não salve a chave privada no GitHub. Sem essas variáveis, o app ainda gera chaves
temporárias, mas notificações existentes podem parar após uma reinicialização.

### Ambiente de teste

`DEV_SEED_ENABLED=true` mantém a rota de dados de teste disponível. Antes de
receber clientes reais, altere para `false` no Render. A rota também exige o valor
de `DEV_SEED_KEY`.

### Testes automáticos

Execute:

```powershell
npm test
```

Os testes cobrem proteção da rota de testes, login e permissões, localização,
fila, despacho, aceite de serviço, troca de senha e exportação de segurança.

## Próximos passos para produção

- Trocar o modo gratuito por disco persistente ou banco de dados
- Armazenamento de vídeos/fotos em serviço próprio
- Recuperação de senha por e-mail
- Confirmação de e-mail
- Banco de dados gerenciado, como PostgreSQL
- Armazenamento de fotos em serviço próprio
- Backup automático
- Revisão jurídica final dos termos de uso e da política de privacidade
