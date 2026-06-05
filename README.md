# Minha Oficina

PWA multiusuário para mecânicos cadastrarem ferramentas, consultarem o
inventário pelo celular ou computador e gerarem relatórios em PDF.

## Executar localmente

É necessário ter o Node.js 20 ou mais recente.

```powershell
node server.js
```

Depois, abra `http://localhost:4173`.

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
- PWA instalável no celular e computador
- Cache da interface para abertura básica sem conexão

## Instalar no celular

O app precisa estar publicado com HTTPS.

- Android/Chrome: abra o site e toque em **Instalar aplicativo**
- iPhone/Safari: abra o site, toque em **Compartilhar** e depois em
  **Adicionar à Tela de Início**

Quando instalado, o app abre sem a barra normal do navegador.

## Publicar online com Render

O arquivo `render.yaml` configura um serviço web Node.js com disco persistente.

1. Envie este projeto para um repositório no GitHub.
2. No Render, escolha **New > Blueprint**.
3. Conecte o repositório e aplique o Blueprint.
4. Ao finalizar, o Render fornecerá um endereço HTTPS instalável como PWA.

O plano configurado usa disco persistente, necessário para não perder contas e
inventários quando o servidor reiniciar.

## Próximos passos para produção

- Trocar o modo gratuito por disco persistente ou banco de dados
- Armazenamento de vídeos/fotos em serviço próprio
- Recuperação de senha por e-mail
- Confirmação de e-mail
- Banco de dados gerenciado, como PostgreSQL
- Armazenamento de fotos em serviço próprio
- Backup automático
- Política de privacidade e termos de uso
