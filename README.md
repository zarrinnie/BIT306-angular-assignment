# Service Day Dashboard

A front-end web application for a corporate **Service Day** — the annual Corporate Social
Responsibility event at which employees volunteer with participating NGOs. The dashboard replaces
the email threads and spreadsheets previously used to coordinate it, and gives both employees and
administrators a live view of NGO availability, volunteer slots, registrations and attendance.

Built with **Angular 22** using a module-based (NgModule) architecture, hand-written HTML5 and CSS,
and asynchronous data loading through Angular's `HttpClient`. The project is **client-side only**:
a simulated back end answers every `/api/*` request inside the browser, so no server is required.

---

## 1. Requirements

| Software | Version used | Where to get it |
|---|---|---|
| Node.js | 24.21.0 (any 20.19+ / 22.12+ / 24+ release works) | <https://nodejs.org> |
| npm | 11.19.0 (installed with Node.js) | — |
| Angular CLI | 22.2.6 (installed as a project dependency) | `npm install -g @angular/cli` is optional |
| Browser | Any current Chrome, Edge, Firefox or Safari | — |

Check what is installed:

```bash
node -v
npm -v
```

## 2. Installing and running

```bash
# 1. Install the project's dependencies (reads package.json)
npm install

# 2. Start the development server
npm start            # or: npx ng serve

# 3. Open the application
#    http://localhost:4200/
```

The development server rebuilds and reloads the page whenever a source file is saved.

Other useful commands:

```bash
npm run build        # production build into dist/assignment1
npm test             # unit tests (Vitest)
npm run watch        # development build that rebuilds on change
```

## 3. Signing in

The prototype ships with a staff directory of one administrator and twenty-four employees. Two
accounts are offered on the sign-in page as one-click shortcuts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@servicedayco.com` | `admin123` |
| Employee | `alia.hassan@servicedayco.com` | `staff123` |

Every other employee uses the same pattern — `firstname.lastname@servicedayco.com` with the password
`staff123`. The full list is in `public/data/users.json`.

> The administrator's **Reset demo data** button (top right of the overview page) restores the
> original seeded data at any time, so the prototype can be demonstrated repeatedly.

## 4. What the application does

| Use case | Who | Where in the application |
|---|---|---|
| 1. Manage NGO availability | Administrator | `/admin/activities` — add, edit and remove activities |
| 2. View Service Day opportunities | Employee | `/activities` — searchable, filterable card list |
| 3. Register, change or withdraw | Employee | `/activities/:id` and `/my-registrations` |
| 4. Monitor participation and slot utilisation | Administrator | `/admin` and `/admin/participation` |
| 5. Notifications and reminders | Administrator / system | `/admin/notifications`, inbox at `/inbox` |
| 6. QR code check-in | Employee / Administrator | `/admin/check-in` and `/check-in/:activityId/:token` |

Business rules enforced by the application:

- Employees see **approved** activities only; drafts stay hidden.
- Registration, changes and withdrawal are blocked once an activity's **cut-off date and time**
  has passed, or once every slot has been taken.
- An employee cannot hold two registrations for the same activity.
- Changing activity releases the old slot and takes the new one in a single operation, so slot
  counts can never disagree.
- Removing an activity withdraws every participant and notifies them automatically.
- A check-in is accepted only with a valid code, from an employee who holds a registration, once.

## 5. Project structure

```
src/
├── main.ts                     bootstraps AppModule with platformBrowser()
├── index.html, styles.css      page shell and global design tokens
└── app/
    ├── app.module.ts           root module: Browser, Routing, Core, Shared
    ├── app-routing.module.ts   route table; every feature is lazily loaded
    ├── app.component.*         application shell: navigation rail, outlet, footer
    ├── core/                   CoreModule — imported once by AppModule
    │   ├── models/             the Model layer: plain interfaces, no logic
    │   ├── services/           state and every HTTP call
    │   ├── guards/             authGuard, administratorGuard
    │   ├── interceptors/       the simulated back end
    │   └── utils/              date formatting for generated messages
    ├── shared/                 SharedModule — reusable components and pipes
    └── features/               one lazily loaded module per area of the app
        ├── auth/  activities/  registrations/  inbox/  admin/  check-in/
public/data/                    seed JSON loaded by the simulated back end
```

### Architecture notes

- **MVC.** `core/models` holds the data structures, component templates are the views and contain
  no business logic, and components act as controllers that delegate every rule to a service.
- **Modules.** `CoreModule` provides the singletons, `SharedModule` carries the reusable user
  interface, and each feature is its own module compiled into a separate chunk that the browser
  downloads only when that area is first opened.
- **State.** Services hold their state in Angular signals, so every view that reads a signal
  updates by itself when the data changes — no page reload and no manual refresh.
- **The simulated back end** (`core/interceptors/mock-backend.interceptor.ts`) answers `/api/*`
  with a 300–700 ms delay, owns the slot counts and the cut-off rules, and reports a refused
  request as HTTP 409 with an explanation the user is shown.

## 6. Third-party packages

| Package | Why it is used |
|---|---|
| `qrcode` | Renders the check-in code as a QR image for Use Case 6 |
| `chart.js` | Slot-utilisation bar chart on the administrator's overview |
| `@types/qrcode` | TypeScript definitions for `qrcode` (development only) |

No CSS framework is used: all layout and styling is hand-written with the CSS box model and
Flexbox. The navigation icons are inline SVG written by hand in
`shared/components/nav-icon`, so the application carries no icon dependency either.

### Interface design

The dashboard is laid out as a fixed **navigation rail** on the left — profile, role-aware links
and sign out — beside a content column on a soft sage canvas. Colour, spacing, type and corner
radii are declared once as custom properties at the top of `src/styles.css`, so the whole palette
can be changed in one place. Deep slate green carries the rail and the dark summary panels; a warm
gold marks every call to action, and is used as a fill behind dark green text rather than as text
itself, which keeps the contrast within WCAG AA.

## 7. Tests

```bash
npm test
```

The suite covers the availability rules (`buildAvailability`), the attendance figures
(`buildAttendanceReport`) and the two shared pipes.
