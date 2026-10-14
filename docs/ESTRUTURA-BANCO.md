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
