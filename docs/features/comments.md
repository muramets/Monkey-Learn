# Comments — Feature Doc

## Текущее состояние
← YOU ARE HERE — **Стадия 1: Comment Overlay**

Реализован базовый `CommentInputOverlay` — модальный input для добавления/редактирования комментариев к checkin-записям в History. Работает через `historyStore.updateCheckin`. Overlay вызывается из `App.tsx` (global portal).

---

## Roadmap

### Стадия 1: Comment Overlay ← YOU ARE HERE
**User flow:** Пользователь нажимает на запись в History → открывается overlay → пишет комментарий → Cmd+Enter сохраняет → overlay закрывается.

- [x] `CommentInputOverlay` компонент (portal-based)
- [x] Keyboard shortcuts (Cmd+Enter save, Escape close)
- [x] Optimistic UI (закрытие до подтверждения сервера)
- [ ] Unit тесты

### Стадия 2: Комментарии к другим сущностям
**User flow:** Комментарии становятся доступны не только к checkins, но и к протоколам, innerfaces, и другим сущностям.

- [ ] Абстрагировать CommentInputOverlay от historyStore
- [ ] Generic comment API (target entity type + id)
- [ ] Собственная Firestore collection для комментариев

### Стадия 3: Продуктовый уровень
**Архитектура:** Отдельная Firestore sub-collection `comments` на каждой сущности. Thread/reply модель. Real-time sync. Mentions. Rich text.

- [ ] Thread model (reply to comment)
- [ ] Mentions (@user)
- [ ] Rich text comments (TipTap integration)
- [ ] Real-time sync между участниками команды
