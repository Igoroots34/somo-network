# Guia de Implantação - SOMO: Network Blackout

Este guia detalha os passos para implantar o jogo SOMO: Network Blackout em produção, utilizando **Vercel** para o frontend (React) e **Render.com** para o backend (FastAPI).

## 📋 Índice

- [Introdução](#introdução)
- [Pré-requisitos](#pré-requisitos)
- [Preparação do Código](#preparação-do-código)
- [Implantação do Frontend na Vercel](#implantação-do-frontend-na-vercel)
- [Implantação do Backend no Render.com](#implantação-do-backend-no-rendercom)
- [Conectando Frontend e Backend](#conectando-frontend-e-backend)
- [Testando a Implantação](#testando-a-implantação)
- [Considerações Finais](#considerações-finais)




## 🚀 Introdução

Este documento serve como um guia abrangente para a implantação do jogo SOMO: Network Blackout. O projeto é dividido em duas partes principais: um frontend desenvolvido com React e TypeScript, e um backend construído com FastAPI em Python. Para garantir uma implantação eficiente e escalável, utilizaremos plataformas de hospedagem modernas e otimizadas para cada componente.

- O **Frontend** será implantado na **Vercel**, conhecida por sua facilidade de uso, desempenho e integração contínua para aplicações web estáticas e serverless.
- O **Backend** será implantado no **Render.com**, uma plataforma que simplifica a hospedagem de serviços web, oferecendo suporte robusto para aplicações Python e WebSockets.

Ao final deste guia, você terá uma instância do SOMO: Network Blackout totalmente funcional e acessível publicamente, com o frontend e o backend comunicando-se perfeitamente.

**Observação:** Este guia assume que você já possui o código-fonte do projeto SOMO: Network Blackout em um repositório Git (GitHub, GitLab, Bitbucket, etc.).




## ✅ Pré-requisitos

Antes de iniciar o processo de implantação, certifique-se de ter os seguintes itens:

1.  **Conta Git:** Uma conta em um serviço de hospedagem de repositórios Git (GitHub, GitLab, Bitbucket) com o código-fonte do projeto SOMO: Network Blackout. É crucial que o código esteja atualizado e funcional.
2.  **Conta Vercel:** Uma conta ativa na [Vercel](https://vercel.com/). Você pode se inscrever gratuitamente.
3.  **Conta Render.com:** Uma conta ativa no [Render.com](https://render.com/). Eles oferecem um plano gratuito para serviços web que entram em hibernação após inatividade.
4.  **Conhecimento Básico de Git:** Familiaridade com operações básicas de Git (clone, push, branch, etc.).
5.  **Acesso ao Código-Fonte:** O código-fonte completo do projeto SOMO: Network Blackout, incluindo os diretórios `backend` e `frontend`.




## 🛠️ Preparação do Código

Para garantir uma implantação suave, é importante que seu código esteja preparado para os ambientes de produção.

### 1. Atualizar `VITE_WS_URL` no Frontend

O frontend precisa saber onde encontrar o backend. Em ambiente de desenvolvimento, usamos `ws://localhost:8000/ws`. Em produção, precisaremos usar a URL pública do Render.com.

Abra o arquivo `frontend/.env` (ou crie-o se não existir) e adicione a seguinte linha. Substituiremos `YOUR_RENDER_BACKEND_URL` pela URL real do seu backend após a implantação no Render.com.

```env
VITE_WS_URL=wss://YOUR_RENDER_BACKEND_URL/ws
VITE_API_URL=https://YOUR_RENDER_BACKEND_URL
```

**Observação:** Usamos `wss://` para a conexão WebSocket em produção, pois a Vercel e o Render.com geralmente forçam conexões seguras (SSL/TLS).

### 2. Configurar CORS no Backend

O backend precisa permitir requisições do frontend hospedado na Vercel. Isso é feito configurando o CORS (Cross-Origin Resource Sharing).

Abra o arquivo `backend/app/main.py` e certifique-se de que o `CORSMiddleware` esteja configurado para permitir o domínio do seu frontend da Vercel. Você pode adicionar a URL da Vercel à lista de `allow_origins`.

```python
from fastapi.middleware.cors import CORSMiddleware

# ... (outras importações)

app = FastAPI()

origins = [
    "http://localhost:3000",  # Para desenvolvimento local
    "https://YOUR_VERCEL_FRONTEND_URL", # Substitua pela URL do seu frontend Vercel
    # Adicione outros domínios se necessário
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... (restante do código)
```

**Observação:** Substituiremos `YOUR_VERCEL_FRONTEND_URL` pela URL real do seu frontend Vercel após a implantação na Vercel.

### 3. Commit e Push das Alterações

Certifique-se de commitar e enviar todas essas alterações para o seu repositório Git. As plataformas de implantação buscarão o código mais recente.

```bash
git add .
git commit -m "Prepare for Vercel and Render deployment"
git push origin main # Ou o nome da sua branch principal
```




## 🌐 Implantação do Frontend na Vercel

Siga estes passos para implantar seu frontend React na Vercel:

### 1. Importar seu Projeto

1.  Acesse o [Vercel Dashboard](https://vercel.com/dashboard).
2.  Clique em **"Add New..."** e selecione **"Project"**.
3.  Selecione o repositório Git onde seu projeto SOMO está hospedado. Se ainda não conectou sua conta Git, a Vercel o guiará para fazer isso.
4.  Ao encontrar o repositório, clique em **"Import"**.

### 2. Configurar o Projeto

Na tela de configuração do projeto:

1.  **Root Directory:** A Vercel tentará detectar automaticamente. Certifique-se de que o **Root Directory** esteja apontando para o diretório `frontend` do seu monorepo. Por exemplo, se seu repositório é `somo` e o frontend está em `somo/frontend`, o Root Directory deve ser `frontend`.
2.  **Framework Preset:** A Vercel deve detectar automaticamente **"Vite"** ou **"Create React App"**. Se não, selecione o preset correto.
3.  **Build and Output Settings:**
    *   **Build Command:** `npm run build` (ou `yarn build` se estiver usando yarn)
    *   **Output Directory:** `dist` (padrão para Vite)
4.  **Environment Variables:** Esta é uma etapa crucial. Você precisará adicionar a variável `VITE_WS_URL` que definimos anteriormente. No entanto, o valor exato só será conhecido após a implantação do backend no Render.com. Por enquanto, você pode deixar um valor temporário ou pular esta etapa e configurá-la depois.
    *   **Name:** `VITE_WS_URL`
    *   **Value:** `wss://your-render-backend-url.onrender.com/ws` (substitua pelo placeholder por enquanto)
    *   **Name:** `VITE_API_URL`
    *   **Value:** `https://your-render-backend-url.onrender.com` (substitua pelo placeholder por enquanto)

### 3. Implantar

1.  Clique em **"Deploy"**.
2.  A Vercel iniciará o processo de build e implantação. Isso pode levar alguns minutos.
3.  Após a implantação bem-sucedida, a Vercel fornecerá uma URL pública para seu frontend (ex: `https://somo-frontend-xyz.vercel.app`). **Anote esta URL**, pois você precisará dela para configurar o CORS no backend e para atualizar o `VITE_WS_URL` e `VITE_API_URL` na Vercel.

### 4. Atualizar `VITE_WS_URL` e `VITE_API_URL` na Vercel (Pós-Backend)

Após implantar o backend no Render.com e obter sua URL pública, você precisará voltar à Vercel para atualizar a variável de ambiente `VITE_WS_URL` e `VITE_API_URL` com o valor correto.

1.  No Vercel Dashboard, vá para o seu projeto frontend.
2.  Clique em **"Settings"** e depois em **"Environment Variables"**.
3.  Edite as variáveis `VITE_WS_URL` e `VITE_API_URL` com a URL real do seu backend no Render.com (ex: `wss://somo-backend.onrender.com/ws` e `https://somo-backend.onrender.com`).
4.  A Vercel fará um redeploy automático do seu frontend com a nova variável de ambiente.




## ☁️ Implantação do Backend no Render.com

Siga estes passos para implantar seu backend FastAPI no Render.com:

### 1. Criar um Novo Serviço Web

1.  Acesse o [Render Dashboard](https://dashboard.render.com/).
2.  Clique em **"New"** e selecione **"Web Service"**.
3.  Conecte sua conta Git (GitHub, GitLab, Bitbucket) e selecione o repositório onde seu projeto SOMO está hospedado.

### 2. Configurar o Serviço Web

Na tela de configuração do serviço web:

1.  **Name:** Dê um nome para seu serviço (ex: `somo-backend`).
2.  **Region:** Escolha a região mais próxima de seus usuários.
3.  **Branch:** Selecione a branch que você deseja implantar (geralmente `main` ou `master`).
4.  **Root Directory:** Defina o diretório raiz do seu backend. Se seu repositório é `somo` e o backend está em `somo/backend`, o Root Directory deve ser `backend`.
5.  **Runtime:** Selecione **"Python 3"**.
6.  **Build Command:** `pip install -r requirements.txt`
7.  **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
    *   **Importante:** O Render.com injeta a porta em que seu aplicativo deve escutar via variável de ambiente `$PORT`. Certifique-se de que seu comando de inicialização use `$PORT` e não uma porta fixa como `8000`.
8.  **Plan Type:** Escolha o plano que melhor se adapta às suas necessidades. O plano gratuito é suficiente para testes e uso ocasional, mas o serviço entrará em hibernação após 15 minutos de inatividade.

### 3. Configurar Variáveis de Ambiente (Environment Variables)

Clique em **"Advanced"** para adicionar variáveis de ambiente. Estas variáveis são importantes para o funcionamento correto do seu backend em produção.

1.  **`PORT`**: Esta variável é automaticamente injetada pelo Render.com, mas é bom ter certeza que seu `Start Command` a utiliza.
2.  **`CORS_ORIGINS`**: Esta é a URL do seu frontend Vercel que você anotou anteriormente. Isso é crucial para que o frontend possa se comunicar com o backend.
    *   **Name:** `CORS_ORIGINS`
    *   **Value:** `https://your-vercel-frontend-url.vercel.app` (substitua pela URL real do seu frontend Vercel)
3.  **`LOG_LEVEL`**: Opcional, para controlar o nível de log em produção.
    *   **Name:** `LOG_LEVEL`
    *   **Value:** `info` ou `warning` ou `error`

### 4. Criar Serviço Web

1.  Clique em **"Create Web Service"**.
2.  O Render.com iniciará o processo de build e implantação. Isso pode levar alguns minutos, pois ele instalará as dependências e iniciará o servidor.
3.  Após a implantação bem-sucedida, o Render.com fornecerá uma URL pública para seu backend (ex: `https://somo-backend.onrender.com`). **Anote esta URL**, pois você precisará dela para atualizar o `VITE_WS_URL` e `VITE_API_URL` na Vercel.

### 5. Verificar Logs

Durante e após a implantação, monitore os logs no dashboard do Render.com para garantir que o backend iniciou sem erros. Procure por mensagens como `INFO:     Uvicorn running on http://0.0.0.0:$PORT` e `INFO:app.main:Application startup complete.`




## 🔗 Conectando Frontend e Backend

Esta é a etapa final e crucial para que seu frontend e backend possam se comunicar em produção.

### 1. Obter as URLs de Implantação

Certifique-se de ter as URLs públicas de ambos os serviços:

-   **Frontend Vercel URL:** (Ex: `https://somo-frontend-xyz.vercel.app`)
-   **Backend Render.com URL:** (Ex: `https://somo-backend.onrender.com`)

### 2. Atualizar Variáveis de Ambiente na Vercel

Conforme mencionado na seção de implantação do frontend, agora você deve atualizar as variáveis de ambiente na Vercel com a URL real do seu backend no Render.com.

1.  No seu [Vercel Dashboard](https://vercel.com/dashboard), navegue até o seu projeto frontend.
2.  Vá para **"Settings"** e depois **"Environment Variables"**.
3.  Edite as variáveis `VITE_WS_URL` e `VITE_API_URL`:
    *   **`VITE_WS_URL`**: Defina o valor para `wss://` seguido da sua **Backend Render.com URL** e o caminho `/ws`. Ex: `wss://somo-backend.onrender.com/ws`
    *   **`VITE_API_URL`**: Defina o valor para `https://` seguido da sua **Backend Render.com URL**. Ex: `https://somo-backend.onrender.com`
4.  Salve as alterações. A Vercel detectará a mudança e fará um redeploy automático do seu frontend.

### 3. Atualizar CORS no Backend (se ainda não o fez)

Se você não configurou o CORS no `backend/app/main.py` com a URL do seu frontend Vercel na etapa de preparação do código, faça isso agora.

1.  Edite o arquivo `backend/app/main.py` no seu repositório Git.
2.  Adicione a URL do seu frontend Vercel à lista `origins` no `CORSMiddleware`.

    ```python
    origins = [
        "http://localhost:3000",  # Para desenvolvimento local
        "https://YOUR_VERCEL_FRONTEND_URL", # Substitua pela URL real do seu frontend Vercel
    ]
    ```
3.  Commit e push esta alteração para o seu repositório Git. O Render.com detectará a mudança e fará um redeploy automático do seu backend.

    ```bash
    git add backend/app/main.py
    git commit -m "Update CORS with Vercel frontend URL"
    git push origin main
    ```




## ✅ Testando a Implantação

Após a conclusão de todas as etapas de implantação e configuração, é fundamental testar a aplicação para garantir que tudo está funcionando conforme o esperado.

### 1. Acessar o Frontend

1.  Abra seu navegador web.
2.  Navegue até a URL pública do seu frontend na Vercel (ex: `https://somo-frontend-xyz.vercel.app`).
3.  Você deve ver a tela inicial do SOMO: Network Blackout com as opções "Criar Sala" e "Entrar na Sala".
4.  Verifique se a notificação "Conectado ao servidor!" aparece, indicando que a conexão WebSocket com o backend foi estabelecida com sucesso.

### 2. Testar a Criação e Entrada em Salas

1.  **Crie uma nova sala:** Digite um nickname, selecione o número de jogadores e clique em "Criar Sala". Verifique se você é redirecionado para a tela da sala e se um código de sala é exibido.
2.  **Abra uma nova aba/janela anônima no navegador** (ou use outro navegador).
3.  Acesse a mesma URL do frontend da Vercel.
4.  Na nova aba, clique em "Entrar na Sala", digite um nickname diferente e o código da sala que você criou na primeira aba.
5.  Verifique se ambos os clientes estão na mesma sala e se os jogadores aparecem na lista.

### 3. Testar o Jogo

1.  Na aba do host (quem criou a sala), adicione alguns bots ou espere por outros jogadores.
2.  Clique em "Iniciar Jogo".
3.  Verifique se o jogo começa, as cartas são distribuídas e o estado do jogo (soma atual, limite, etc.) é exibido corretamente.
4.  Tente jogar algumas cartas, tanto numéricas quanto especiais, e observe se o estado do jogo é atualizado em tempo real para todos os clientes.
5.  Teste o comportamento dos bots.
6.  Simule um jogo completo para verificar a lógica de eliminação e vitória.

### 4. Verificar Logs

Monitore os logs de ambos os serviços para identificar quaisquer erros ou avisos:

-   **Vercel:** No seu Vercel Dashboard, vá para o projeto frontend, clique em "Deployments" e selecione o deployment mais recente para ver os logs de build e runtime.
-   **Render.com:** No seu Render Dashboard, vá para o serviço web do backend e clique na aba "Logs" para ver a saída do servidor FastAPI.

### 5. Solução de Problemas Comuns

-   **Frontend não conecta ao Backend:**
    *   Verifique se a URL do backend no Render.com está correta na configuração das variáveis de ambiente da Vercel (`VITE_WS_URL` e `VITE_API_URL`).
    *   Verifique se o backend no Render.com está rodando e não hibernou (pode levar alguns segundos para acordar se estiver no plano gratuito).
    *   Verifique os logs do backend no Render.com para erros de inicialização.
-   **Erros de CORS:**
    *   Certifique-se de que a URL exata do seu frontend Vercel (ex: `https://somo-frontend-xyz.vercel.app`) foi adicionada à lista `allow_origins` no `CORSMiddleware` do seu `backend/app/main.py`.
    *   Lembre-se de commitar e fazer push da alteração no `main.py` para que o Render.com faça um redeploy.
-   **Jogo não inicia ou não funciona:**
    *   Verifique os logs de ambos os serviços para mensagens de erro relacionadas à lógica do jogo.
    *   Confirme se o `Start Command` do backend no Render.com está correto (`uvicorn app.main:app --host 0.0.0.0 --port $PORT`).




## ✨ Considerações Finais

Parabéns! Você implantou com sucesso o jogo SOMO: Network Blackout em produção. Este é um marco significativo no desenvolvimento do seu projeto.

### Gerenciamento Contínuo

-   **Implantação Contínua (CI/CD):** Tanto a Vercel quanto o Render.com oferecem integração contínua. Isso significa que, após a configuração inicial, cada `git push` para a branch configurada (geralmente `main`) acionará automaticamente um novo build e implantação do seu frontend e/ou backend.
-   **Monitoramento:** Monitore regularmente os logs e o desempenho de seus serviços nas plataformas Vercel e Render.com para identificar e resolver problemas proativamente.
-   **Escalabilidade:** Ambas as plataformas oferecem opções de escalabilidade para lidar com o aumento do tráfego. No Render.com, você pode escalar seu serviço web para lidar com mais requisições. Na Vercel, o escalonamento é automático para a maioria dos casos de uso de frontend.
-   **Custos:** Esteja ciente dos custos associados aos planos pagos, caso seu uso exceda os limites dos planos gratuitos ou se você precisar de recursos adicionais (como serviços que não hibernam no Render.com).

### Próximos Passos

-   **Domínio Personalizado:** Considere configurar um domínio personalizado para seu frontend na Vercel para uma URL mais amigável (ex: `play.somo.com`).
-   **Otimização de Performance:** Explore as opções de otimização de performance oferecidas pelas plataformas, como caching, CDNs e otimização de imagens.
-   **Segurança:** Revise as práticas de segurança, especialmente para o backend, garantindo que as APIs estejam protegidas e que não haja exposição de informações sensíveis.
-   **Novas Funcionalidades:** Continue desenvolvendo e adicionando novas funcionalidades ao jogo, aproveitando a facilidade de implantação contínua.

Esperamos que você e seus jogadores desfrutem do SOMO: Network Blackout!

---

**Desenvolvido com ❤️ pela equipe SOMO**

*Última atualização: 21 de Agosto de 2025*


