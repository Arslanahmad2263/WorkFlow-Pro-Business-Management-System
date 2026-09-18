# User Guide

WorkFlow-Pro is a business management and task tracking system for small teams.
This guide walks through the main workflows for each role.

## Signing in

1. Open the app (http://localhost when running via Docker).
2. Use the **Sign in** form with your username and password.
   - No account? Click **Create one** to register — you start as an *Employee*.
3. You land on the **Dashboard**.

Demo accounts (`DemoPass123!`): `admin`, `manager`, `alice`, `bob`, `carol`.

## Role overview

| Role | Capabilities |
| --- | --- |
| **Admin** | Everything, plus managing team users (create, change roles, activate/inactivate, delete). |
| **Manager** | Create/edit/delete projects and tasks, manage project members, view reports. |
| **Employee** | View all projects and tasks; update the status/progress of tasks **assigned to them** only. |

---

## 1. Dashboard

Shows at a glance:

- **Projects** total and how many are active.
- **Tasks** total, completion percentage, and counts per status.
- **Overdue** tasks and projects.
- **Team members** and tasks completed in the last 7 days.
- **Projects by status**, **Upcoming deadlines**, and a **Recent activity** feed.

Click any upcoming deadline to jump to that task in the task list.

## 2. Projects

### Browse & filter

- Open **Projects** from the side menu.
- Filter by status (All / Planning / Active / On hold / Completed) and use the
  search box.
- Pagination controls appear when there are more than 20 projects.

### Create a project (Manager/Admin)

1. Click **+ New project**.
2. Fill in name, description, status, priority, start/due dates.
3. **Create project** — it appears in the list immediately.

### View a project

- Click a project card to open the **project detail** page:
  - Progress bar, dates, task count.
  - **Team** panel — list of members; Manager/Admin can **+ Add member** or
    **Remove**.
  - **Tasks** panel — every task in the project with progress/status; Manager/
    Admin can **+ Add task** or **Delete**.

### Edit / delete a project (Manager/Admin)

On the detail page use **Edit** or **Delete** (delete removes the project,
its tasks and memberships).

## 3. Tasks

### Browse & filter

Open **Tasks** — a searchable, filterable table:

- Filter by **status**, **priority**, **project**, **assignee**.
- Keyword **search** over the task title.
- Use **Load more** to page through results.
- Overdue tasks are highlighted in red.

### Create a task (Manager/Admin)

1. **+ New task**.
2. Choose the **project**, **title**, **description**, **assignee** (must be a
   member of that project), status, priority, due date, progress and estimated
   hours.
3. Optional **attachment** (png/jpg/gif/pdf/txt/docx/xlsx/csv/md, ≤ 5 MB).
4. **Create task**.

### Update / complete a task

- **Employees**: tasks assigned to you show a status dropdown inline — choose the
  status. Note: marking *Done* sets progress to 100% automatically.
- **Manual progress**: Managers/Admins can set any 0–100 value. To move a task
  back out of *Done*, clearing progress below 100 happens automatically.

### Delete a task (Manager/Admin)

Use the **Delete** link in the row (confirm in the dialog).

## 4. Team (Admin only)

Open **Team**:

- Table of all users with role, email, joined date and active/inactive status.
- **+ New user** — create an account and choose its role.
- **Manage** any row — change role, activate/inactivate, or set a new password.
- **Delete** — remove a user (their task history is preserved).
- You cannot delete your own account.

## 5. Reports (Manager/Admin only)

Open **Reports**:

- **Workload snapshot** — tasks completed in the selected period, overdue tasks.
- **Completion rate by priority** — % of completed tasks per priority level.
- **Average progress by status**.
- **Project progress table** — per project: status, due date, member count,
  tasks done/total, overdue count, progress bar.

Change the **Period** dropdown (7/14/30/90/180/365 days) to re-scope the report.

## 6. Logging out

Click **Sign out** in the sidebar — your session (refresh token) is revoked on
the server.