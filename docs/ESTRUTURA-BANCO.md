# Estrutura do banco (Firestore)

users/{uid}                          dados pessoais do app (modo solo, como no Treino atual)
invites/{código}                     convite: { gymId, ativo, criadoPor }
gyms/{gymId}                         { nome, ownerUid, corDestaque, logoUrl }
  members/{uid}                      { role: owner | coach | student, nome, email, inviteCode? }
  students/{uid}                     { nome, status: ativo|inativo, coachUid, nascimento, objetivo }
    plans/{planId}                   ficha de treino (exercícios, séries, reps, carga, observações)
    assessments/{id}                 avaliação física (peso, medidas, dobras, fotos, observações)
    workouts/{id}                    treinos feitos pelo aluno
    consent/{id}                     consentimento LGPD do aluno
  templates/{id}                     modelos de ficha da academia

Fotos (Storage): gyms/{gymId}/students/{uid}/assessments/...  e  gyms/{gymId}/logo/...

## Quem pode o quê
- Dono (owner): tudo da própria academia, inclusive cadastrar professores.
- Professor (coach): ver alunos, montar fichas, fazer avaliações.
- Aluno (student): lê a própria ficha e avaliações; grava os próprios treinos.
- Ninguém enxerga dados de outra academia.

## Como o aluno entra
O professor gera um convite (código). O aluno cria conta, digita o código e vira "student" daquela academia.

## Atualizações
- invites/{código}: { gymId, ativo, papel: "student" (padrão) | "coach" }. O código de professor só o dono cria.
- gyms/{id}: também guarda inviteCode (alunos), inviteCoach (professores), corDestaque, logoUrl.
- students/{uid}/plans/atual: { nome, dias: [{ nome, descanso, ex: [{ n, s, r, kg, obs, id? }] }] }
- students/{uid}/assessments/{id}: { data, sexo, nascimento, peso, altura, medidas{}, protocolo (p3|p7|manual), dobras{}, gorduraManual, imc, gordura, massaMagra, massaGorda, fotos{frente,lado,costas = caminho no Storage}, obs }
- students/{uid}/workouts/{id}: resumo dos treinos feitos (o app do aluno envia só os feitos depois de entrar na academia).
- Cálculo de gordura: Jackson & Pollock (3 e 7 dobras) + Siri.

## Novidades (alertas, recado, QR, meta)
- gyms/{id}: + checkinToken (QR de presença), fichaSemanas (4/6/8/12, padrão 8), corFundo (cor de fundo do app; vazio = automático), prontosOff (ids de modelos prontos desmarcados).
- students/{uid}: + telefone, fichaEm, proximaAval (AAAA-MM-DD), meta { tipo: gordura|peso|cintura|massaMagra, alvo, inicio, dataInicio }, ultimoTreino, treinos, ultimoCheckin.
- students/{uid}/plans/recado: { texto, em, por } (o professor escreve, o aluno lê).
- students/{uid}/checkins/{AAAA-MM-DD}: { token, data, em } (presença pelo QR; o token precisa ser o do QR atual).
