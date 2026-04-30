# Swipe Back Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На мобильных устройствах добавить свайп вправо от левого края экрана для навигации назад (аналог iOS native back gesture).

**Scope:** Только свайп назад. Свайп вперёд не реализуется — в stack-based навигации нет понятия "вперёд" без отдельного forward-стека, а пользователи мобильных приложений его не ожидают.

**Architecture:** Кастомный хук `useSwipeBack` отслеживает `touchstart`/`touchend` на корневом контейнере в `App.jsx` и вызывает `goBack()` при жесте. Никаких изменений в страницах, роутинге или стейте не требуется.

**Tech Stack:** React 19, touch events API (нет зависимостей)

---

## Изменяемые файлы

| Файл | Что меняется |
|------|--------------|
| `src/hooks/useSwipeBack.js` | **Создать** — хук обнаружения свайпа |
| `src/App.jsx` | Подключить хук к корневому контейнеру |

---

## Task 1: `useSwipeBack.js` — создать хук

**Files:**
- Create: `src/hooks/useSwipeBack.js`

- [ ] **Step 1: Создать хук**

```js
import { useEffect, useRef } from "react";

// Свайп назад: касание у левого края → движение вправо
export function useSwipeBack(ref, onSwipeBack, { enabled = true } = {}) {
  const touchStart = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    function handleTouchStart(e) {
      const touch = e.touches[0];
      // Реагируем только на касание в левой зоне (первые 20px)
      if (touch.clientX > 20) {
        touchStart.current = null;
        return;
      }
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(e) {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);

      touchStart.current = null;

      // Минимум 50px вправо, горизонтальнее вертикали
      if (dx > 50 && dx > dy) {
        onSwipeBack();
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, onSwipeBack, enabled]);
}
```

Параметры хука:
- `ref` — React ref на DOM-элемент, к которому прикреплены слушатели
- `onSwipeBack` — колбэк, вызывается при успешном жесте (передаётся `goBack`)
- `enabled` — можно отключить для конкретных страниц (например, форм с горизонтальным скроллом)

- [ ] **Step 2: Проверить хук изолированно**

В `App.jsx` временно добавить `console.log("swipe back")` как `onSwipeBack`, открыть на телефоне и проверить срабатывание жеста.

---

## Task 2: `App.jsx` — подключить хук

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Добавить импорты**

Рядом с импортом `useAuth` (~строка 7):

```js
import { useRef } from "react";
import { useSwipeBack } from "./hooks/useSwipeBack";
```

> `useRef` уже может быть в импорте из `react` — добавить только если его нет.

- [ ] **Step 2: Создать ref и подключить хук**

Внутри компонента `App`, сразу после объявления `goBack` (~строка 63):

```js
const mainRef = useRef(null);
useSwipeBack(mainRef, goBack, { enabled: navStack.length > 0 });
```

Передаём `enabled: navStack.length > 0` — жест активен только когда есть куда возвращаться.

- [ ] **Step 3: Навесить ref на корневой div**

Строка ~412, корневой элемент:

```jsx
// До:
<div className="min-h-screen bg-[#0a0908] pb-16 md:pb-0">

// После:
<div ref={mainRef} className="min-h-screen bg-[#0a0908] pb-16 md:pb-0">
```

- [ ] **Step 4: Проверить вручную на телефоне**

1. `npm run dev`
2. Открыть на телефоне через IP локальной сети (`http://192.168.x.x:5173`)
3. Перейти на любую страницу из навигации (например, в профиль игрока)
4. Провести пальцем от левого края вправо — должен сработать переход назад
5. Проверить что на `dashboard` (navStack пуст) жест не срабатывает
6. Проверить что обычный скролл вверх-вниз не перехватывается

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSwipeBack.js src/App.jsx
git commit -m "feat: swipe back navigation for mobile"
```

---

## Известные ограничения

- **Зона 20px** — чуть шире iOS-нативной (~10px), чтобы компенсировать неточность пальца. При необходимости можно увеличить до 30px.
- **Нет анимации перехода** — страница переключается мгновенно, без эффекта "сдвига". Добавить можно через CSS transition на `main`, но это отдельная задача.
- **Страницы с горизонтальным скроллом** (таблицы рейтинга) — `passive: true` на слушателях означает, что браузер обрабатывает скролл независимо. Конфликта нет: горизонтальный скролл внутри элемента с `overflow-x: auto` не поднимается до корневого div.
- **Safari edge swipe** — на iOS Safari свайп от левого края управляется браузером (history.back). Наш жест срабатывает раньше (зона 20px) и вызывает `goBack()` из React-навигации, что корректно. Двойного срабатывания не будет, так как history браузера не меняется при нашей навигации.
