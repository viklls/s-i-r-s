# Smart Incident Reporting System

## Структура проекту
```
final-project/
├── IncidentApi/          ← бекенд (Node.js + Express + Prisma)
└── smart-incident-reporting/  ← фронтенд (HTML + CSS + JS)
```

## Запуск

### 1. Бекенд
```powershell
cd IncidentApi
npm install
npm start
```
Сервер запуститься на http://localhost:3000

### 2. Фронтенд
Відкрий папку `smart-incident-reporting` у VS Code,
клікни правою кнопкою на `index.html` → **Open with Live Server**

Або через термінал:
```powershell
cd smart-incident-reporting
npx serve .
```
Відкрий http://localhost:3000 у браузері (або порт який вкаже Live Server)

## Готово!
- Головна: index.html
- Логін: login.html  
- Дашборд: dashboard.html (після логіну)
