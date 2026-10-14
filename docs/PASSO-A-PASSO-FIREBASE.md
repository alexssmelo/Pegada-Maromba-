# Criar o Firebase NOVO (não reaproveitar o treinohit-b7027)

1. Acesse console.firebase.google.com (conta Google com verificação em duas etapas ligada).
2. Adicionar projeto > nome sugerido: treino-academia > pode desligar o Google Analytics > Criar.
3. Engrenagem > Configurações do projeto > Seus aplicativos > ícone </> (Web) > apelido "painel" > Registrar.
   Copie os valores do firebaseConfig e me envie (não são segredo).
4. Build > Authentication > Vamos começar > ative E-mail/senha e Google.
5. Build > Firestore Database > Criar banco > modo produção > região southamerica-east1 (São Paulo).
6. Build > Storage > Vamos começar (exige plano Blaze; configure alerta de gastos em Billing > Orçamentos e alertas).
7. Firestore > Regras: cole o conteúdo de firestore.rules > Publicar. Storage > Regras: cole storage.rules > Publicar.
8. Authentication > Configurações > Domínios autorizados: adicione o endereço do GitHub Pages do repositório novo.
9. Google Cloud > APIs e serviços > Credenciais > chave de API: restringir ao domínio do site.
