# Todo List App (TaskFlow)

A complete, fully-functional to-do list application built with vanilla HTML, CSS, and JavaScript.

## Features

- Add tasks with:
  - title
  - description
  - priority (Low / Medium / High)
  - due date
  - category
- Task management:
  - mark complete/incomplete
  - edit in modal
  - delete with undo
  - view details
- Local storage persistence for:
  - tasks
  - categories
  - theme
  - filter/sort/search preferences
- Filtering and sorting:
  - status (All / Active / Completed)
  - priority
  - category
  - sort by creation date, due date, or priority
- Search by task title or description
- Category creation and management
- Task statistics (total, active, completed, completion %)
- Dark/light mode with persistence
- Responsive layout for mobile, tablet, and desktop
- UI polish:
  - smooth transitions and list animations
  - empty-state messaging
  - undo for recently deleted tasks
  - keyboard shortcuts:
    - `Enter` to add tasks/categories
    - `Escape` to close modal

## Tech Stack

- HTML5 semantic markup
- CSS3 (Grid/Flexbox, CSS variables, animations)
- Vanilla JavaScript (ES6+)
- Browser LocalStorage API

## Project Structure

- `/home/runner/work/todo-list-app/todo-list-app/index.html` – main app structure
- `/home/runner/work/todo-list-app/todo-list-app/styles.css` – styling, responsive design, and theming
- `/home/runner/work/todo-list-app/todo-list-app/script.js` – app logic, state management, and persistence

## Running Locally

No dependencies are required.

1. Open `/home/runner/work/todo-list-app/todo-list-app/index.html` in your browser.
2. Start adding and managing tasks.
3. Refresh the page to verify persisted data from localStorage.

## Accessibility Notes

- Semantic sectioning and headings
- ARIA labels for key controls
- Live regions for stats/task updates and undo toast
- Keyboard support for form submission and modal dismissal
