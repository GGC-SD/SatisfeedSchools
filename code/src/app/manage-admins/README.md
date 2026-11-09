# Manage Admins

Superadmins can search, add, and remove regular admin access.
Removing access keeps the person's login account.
Superadmins cannot be added or removed through this page.

## Page access

| Role              | Pages                                                           |
| ----------------- | --------------------------------------------------------------- |
| Visitor or member | Dashboard Insights                                              |
| Admin             | Dashboard Insights, Dashboard, Summary, Upload, Manage Versions |
| Superadmin        | All pages, including Manage Admins                              |

Protected pages require a verified email. Accounts without a role
record receive member access.

## Set up roles manually

Confirm the account exists and has a verified email.

Open Firebase Console → Firestore Database → Data → user_roles.
Create a document named after the account's lowercase email.

Add these string fields:

| Field     | Admin                   | Superadmin                       |
| --------- | ----------------------- | -------------------------------- |
| `email` | Lowercase account email | Lowercase account email          |
| `role`  | `admin`               | `super_admin`                  |
| `uid`   | Not required            | UID from Authentication → Users |

Superadmin access requires the UID to match the signed-in account.

## Add an admin through the page

1. Sign in as a superadmin and open Manage Admins.
2. Enter the person's account email.
3. Click Add Admin when the account check succeeds.

The account must exist, have a verified email, and have no existing
role record. The server rechecks permissions before saving and only
grants the `admin` role.

## Admin Logs

Superadmins can see the latest 50 changes: who added or removed
admin access, whose access changed, and when.

Logs are saved in `role_changes` and cannot be edited from the page.
They must be edited/removed through the Firebase Console
Manual Firebase Console changes are not logged.

## Local credentials

Adding admins requires approved Firebase server credentials.

Place `serviceaccountkey.json` in the `code` folder and add this
to `code/.env`:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS=./serviceaccountkey.json
```

Restart with `npm run dev` from the `code` folder.

Keep both files out of Git and the key out of Docker images.
For AWS, configure credentials on the hosted server separately.
Website users do not need their own key.

## Firestore permissions

Manage rules under Firebase Console → Firestore Database → Rules.

The published rules must allow:

- Verified users to read their own role.
- Superadmins to list roles and delete regular admin grants.

Browser role creation and updates stay blocked.
Adding admins goes through the server endpoint using Admin SDK permissions.

Rules affect every branch using the same Firebase project.
Coordinate changes with SD2.

## Troubleshooting

| Error                           | Check                            |
| ------------------------------- | -------------------------------- |
| `app/invalid-credential`      | Server credentials and key path  |
| `resource-exhausted` or `8` | Firestore quotas                 |
| `permission-denied`           | Account role and published rules |
