# ⚡ BRK Button Manager

> Construtor visual de botões de ação rápida para o **Chatwoot** — controle total por time, usuário e analytics incluídos.
 
---

## 💡 Por que foi desenvolvido?

Toda operação de atendimento tem ações repetitivas: disparar uma proposta, registrar um cliente, gerar um link de pagamento, abrir um contrato. No **Chatwoot**, essas ações não têm automação nativa — cada atendente precisava fazer tudo manualmente, em múltiplos sistemas, consumindo tempo e gerando erros humanos.

O **BRK Button Manager** nasceu para resolver isso. É uma plataforma de gestão que injeta botões de ação diretamente no painel de atendimento do Chatwoot, sem alterar o código-fonte, sem dependências e com zero configuração técnica pelo atendente.

---

## ✨ Benefícios

- ⚡ **Ações com 1 clique** — execute webhooks, abra links externos ou modais personalizados direto do Chatwoot
- 🔒 **Controle de acesso granular** — restrinja botões por **usuário** (`email`) ou por **time** (`Vendas`, `Suporte`...)
- 📊 **Analytics integrado** — veja quais botões mais usados, ranking de atendentes e cliques por mês/dia
- 🔀 **Agrupamento por área** — botões organizados por grupo (Vendas, Financeiro, Suporte) no painel do atendente
- ↕️ **Drag & Drop** — reordene botões simples arrastando e soltando
- 📋 **Duplicar botões** — reaproveite configurações existentes com um clique
- 🧩 **Zero invasão** — instalado via script customizado do Chatwoot, sem tocar no código da plataforma

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Backend (API) | Node.js + Express |
| Banco de dados | JSON persistido via n8n / Filesystem |
| Frontend (painel admin) | HTML + CSS + JavaScript Vanilla |
| Integração Chatwoot | Script customizado via `chatwoot-embed.txt` |
| Hospedagem | [EasyPanel](https://easypanel.io) |

---

## 🚀 Como instalar

### 1. Suba o servidor

```bash
git clone https://github.com/pedropauloat-sys/chatwoot-custom-button-builder.git
cd chatwoot-custom-button-builder
npm install
npm start
```

### 2. Cole o script no Chatwoot

Nas configurações do seu Chatwoot, vá em:
**Configurações → Integrações → Scripts Personalizados**

Cole todo o conteúdo do arquivo `chatwoot-embed.txt`.

### 3. Pronto!

Na barra lateral de **Configurações**, aparecerá automaticamente o item **"Construtor de Botões"** para os usuários administradores.

---

## 📖 Como usar

### Criando um botão

1. Acesse **Configurações → Construtor de Botões**
2. Clique em **+ Criar botão**
3. Defina:
   - **Texto e ícone** do botão
   - **Ação** (Webhook, Link ou Modal personalizado)
   - **Exibição** (visível para todos, para um time ou usuários específicos)
4. Clique em **Salvar**

### Tipos de ação

| Tipo | Quando usar |
|------|------------|
| ⚡ Webhook | Disparar automações no n8n, Zapier, Make... |
| 🔗 Link | Abrir sistema externo (CRM, ERP, proposta...) |
| 🪟 Modal | Exibir formulário ou conteúdo HTML personalizado |

### Permissões de exibição

Ao criar um botão, você pode limitar quem vê ele:

- **Vazio** → visível para todos os atendentes
- **Usuário** → selecione um e-mail específico da sua equipe
- **Time** → selecione um dos times cadastrados no Chatwoot (ex: `Vendas`)

---

## 📊 Analytics

Acesse a aba **📊 Analytics** no painel para visualizar:

- Total de cliques (geral, mensal e diário)
- 🔥 Botões mais utilizados
- 🏆 Ranking de atendentes por engajamento

---

## 🗂 Estrutura do projeto

```
brk-button-manager/
├── public/
│   ├── index.html          # Painel de gerenciamento (Admin)
│   └── widget.js           # Script injetado no Chatwoot
├── server.js               # API REST (botões, analytics, reorder)
├── chatwoot-embed.txt      # Script de instalação no Chatwoot
├── package.json
└── Dockerfile
```

---

## 📝 Licença

Este projeto é de uso interno da **BRK / UsesBRK**. Todos os direitos reservados.

---

<div align="center">
  Desenvolvido com ❤️ para otimizar a operação de atendimento da BRK.
</div>
