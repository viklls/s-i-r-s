# Incident Management API

Бекенд для системи управління інцидентами.

## Як запустити

Виконайте ці команди по черзі:

1. **Встановити залежності:**
`npm install`

2. **Створити базу та завантажити дані (Admin/User):**
`npx prisma db push`
`node prisma/seed.js`

3. **Запустити сервер:**
`npm run start`

---

## Інфо для Фронтенду

* **Base URL:** `http://localhost:3000`
* **Авторизація:** Bearer Token у заголовку `Authorization`.

### Ендпоінти:
* `POST /api/auth/register` — реєстрація.
* `POST /api/auth/login` — логін (отримання токена).
* `GET /api/incidents` — список усіх інцидентів (публічний).
* `GET /api/incidents/:id` — деталі одного інциденту (публічний).
* `POST /api/incidents` — створити новий (**потрібен токен**).
* `PATCH /api/incidents/:id/status` — змінити статус (**тільки Admin**).
* `PATCH /api/incidents/:id/comment` — додати коментар (**тільки User**).

### Тестові акаунти:
* **Admin:** `admin@incident.local` / `Admin123!`
* **User:** `user@incident.local` / `User123!`