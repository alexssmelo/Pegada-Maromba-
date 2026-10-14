# Pegada Maromba
Sistema para academias: **app do aluno** (`index.html`) + **painel do professor** (`painel.html`).

- Painel: alunos, fichas (com modelos), avaliação física (Pollock 3/7, fotos, comparação, relatório PDF), evolução, equipe, marca (logo e cor), convites.
- App do aluno: entra com código da academia, recebe a ficha do professor (player com carga, repetições, descanso e recordes), vê as próprias avaliações.
- Firebase: Authentication, Firestore (`firestore.rules`) e Storage (`storage.rules`). Veja `docs/`.
- A cada publicação, mude a constante `CACHE` em `sw.js`.
