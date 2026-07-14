# Quickstart

## 1. Start the stack

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

On the **very first start**, the backend seeds a default admin account (and a handful of demo users) into the empty database. This is controlled by `PREFILL_USERS: "true"` in `docker-compose.yml` and only runs while the `users` collection is empty — it has no effect on subsequent restarts once real accounts exist.

## 2. Log in with the default admin

| Field    | Value |
|----------|-------|
| Username | `admin` |
| Password | `123` |

Open http://localhost:3000, click the profile icon top-right, and log in with the credentials above.

> **Do this immediately after first login:** these are public, hard-coded demo credentials. Go to **Settings → Account** and change the admin password (and email, if you like) before doing anything else — especially before exposing the app beyond your own machine.

## 3. Add your real users

Once logged in as admin:

1. Open the profile menu → **Admin** (or navigate directly to `/admin/users`).
2. Use **User Management** to add the people who should actually have accounts, and to remove/edit the seeded demo accounts (`Lena Hoffmann`, `Jonas Becker`, `Sophie Wagner`, `Maximilian Schmidt`, `Alex Neumann`) you don't need.
3. New users can also self-register via the login dialog's "Register" option — self-registration is always created as a non-admin account; only an existing admin can grant admin rights via User Management.

## Notes

- The seed logic lives in `backend/mock/prefill.ts`; the account list can be edited there before the first start if you want different demo data (or none — just remove the entries, or set `PREFILL_USERS` to `"false"`/remove it from `docker-compose.yml` to skip seeding entirely).
- For local (non-Docker) development, `backend/.env` also sets `PREFILL_USERS=true` by default — same admin/123 login applies there.
