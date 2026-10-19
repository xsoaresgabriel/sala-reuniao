# Agenda da sala de reunião — versão Flask (legado)

> **Esta versão não é mais a usada.** A agenda que roda hoje é a
> HTML standalone em
> [Coopertruni-Ti/sala-de-reuniao](https://github.com/Coopertruni-Ti/sala-de-reuniao),
> sem backend. Este repositório fica guardado como referência histórica.

Aplicação Flask para agendar a sala de reunião, com persistência em
PostgreSQL (via Render) e embed via iframe no Microsoft Teams.

## Como era usado

- `app.py` — rotas `/`, `GET /agenda/<data>`, `POST /agenda/<data>`.
- `templates/index.html` — página única com grade de horários (7:30–17:00).
- `static/script.js` — seleção de horários, reserva individual ou múltipla.
- `static/style.css` — tema escuro.
- Deploy em Render.com com `DATABASE_URL` injetada no ambiente,
  usando `psycopg2` + `gunicorn`.

## Como rodar (se precisar)

```bash
pip install -r requirements.txt
export DATABASE_URL=postgres://...
python app.py
```
