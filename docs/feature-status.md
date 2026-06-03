# Feature Status

Статус реализации всех задокументированных фич. Обновлять при каждом завершении или начале работы над фичей.

_Последнее обновление: 2026-06-03_

---

## ✅ Реализовано

| Фича | Документ | Коммит / ветка |
|------|----------|----------------|
| Настраиваемый порог рейтинга сезона (`none` / `absolute` / `percent`) | `2026-03-24-season-rating-threshold-design.md` | sql/008, queries.js, metrics.js |
| Dark Premium редизайн (Sidebar, glass-card, emerald-палитра) | `2026-03-26-dark-premium-redesign.md` | — |
| Аватары игроков (загрузка, хранение в Storage) | `2026-03-26-player-avatars-*.md`, `2026-03-29-player-avatars-*.md` | sql/009, PlayerAvatar.jsx |
| Ничья как результат игры (winner/result = "draw") | `2026-03-26-game-draw-plan.md` | — |
| Лучший ход: запись и статистика в профиле | `2026-03-29-best-move-design.md`, `2026-03-29-best-move.md` | sql/010, metrics.js |
| Аудит: инфраструктура и логирование auth-событий | `IRON_MAF_AUDIT_SETUP_GUIDE_1.md`, `2026-04-07-audit-log-code-plan.md` | auditLog.js, useAuth.jsx |
| Лучший ход: детальный блок на странице игры | `2026-04-23-best-move-game-detail.md` | 18adb73 |
| Исправление потери данных при импорте бэкапа | `2026-04-23-backup-export-fix.md` | defc4d3 |
| Прокси Supabase через Vercel (обход блокировки провайдера) | — | 231ef8a, `vercel.json` |
| Параметризация бренда клуба (название/город через env, лого/иконки из `public/`) + гайд по деплою шаблона | `2026-05-25-template-deploy-roadmap.md`, `DEPLOY_GUIDE.md` | clubConfig.js, .env.example, README.md |

---

## ⚠️ Реализовано частично

### UX-улучшения (`2026-03-19-ux-improvements-plan.md`)

Документ содержит 15 этапов. Статус по этапам:

| Этап | Описание | Статус |
|------|----------|--------|
| 2. Toast + загрузка | Типы тостов (success/error/warning), спиннер при сохранении | ✅ |
| 7. Навигация | navStack (полный стек переходов), подсветка активного таба | ✅ |
| 12. Производительность | Параллельные API-запросы, skeleton-загрузка | ✅ |
| 1. Мобильные таблицы | card-view бонусов в GameForm на мобильном | ✅ |
| 6. Защита данных | Автосохранение черновика GameForm в localStorage | ❌ |
| 3. Фильтр сезона | Убрать дублирующий локальный фильтр в Dashboard | ❌ |
| 4. Пустые состояния | Тултипы аббревиатур (WR%, ПУ%), кнопки в EmptyState | ❌ |
| 8. Улучшения форм | Авто-распределение ролей, пресеты даты ("Сегодня"/"Вчера") | ❌ |
| 9. Profile & Compare | Группировка секций, итоговая строка в Compare | ❌ |
| 10. GameList & Detail | Сортировка игр, кликабельные ники как ссылки | ❌ |
| 11. Settings & логин | autocomplete на LoginForm, консистентные диалоги удаления | ❌ |
| 13. Accessibility | Focus trap в Modal, ARIA-атрибуты, клавиатура | ❌ |
| 14. Поиск | Поиск в PlayerList, сортировка в TournamentDetail | ❌ |
| 5. TabBar | safe-area-inset для iPhone | ❌ |
| 15. Визуальная консистентность | Легенды графиков, copy feedback в Settings | ❌ |

---

## ❌ Не реализовано

| Фича | Документ | Примечание |
|------|----------|------------|
| Переключение темы (тёмная / светлая / авто) | `2026-03-19-theme-switching-design.md` | Нет `useTheme.jsx`, нет CSS-переменных, нет UI в Settings |
| Страница журнала аудита (роль `super_admin`) | `2026-04-21-audit-log-display.md` | Нет `AuditLog.jsx`, нет роли `super_admin` в БД и в `useAuth` |
| Нерейтинговые турниры (`count_for_rating`) | `2026-04-23-tournament-no-rating.md` | Нет sql/011, нет поля в БД, нет чекбокса в TournamentForm |
