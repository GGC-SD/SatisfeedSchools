## Requirements for using Manage Admins

- Be signed in with a verified email.
- Have a `user_roles` document named after your lowercase email.
- Have `role` set to `super_admin` and `uid` matching your Firebase Authentication UID.
- Firestore rules must allow superadmins to list roles and remove regular admins.

Adding admins also requires Firebase credentials configured on the server.
Users do not need their own service-account key when using the hosted app.

# Manage Admins

Superadmins use this page to view, add and remove admin access.
Removing access does not delete the person’s account.
Superadmins cannot be added or removed from this page.

# Page Access for all Roles

Regular signed in users or signed out, get member role by default and they can access only one page → Dashboard Insights
Admins need to be verified and can access → Dashboard Insights, Dashboard, Summary, Upload, Manage Versions
Superadmins can access → All pages, including Manage Admins

`Users must be signed in with a verified email to use protected pages.`

## How to manually add Superadmins

Firebase Console → Data → user_roles (collection).

1. Click Add document
2. For "Document ID" type person's email

   a. First "Field" type the word "email" in the field, String = [Email of person]

   b. Next "Field" type the word "role", String = [super_admin]

   c. Next "Field" type the word "uid", String = [uid for super admin]

## How to add admins through Manage Admins Page

1. Sign in as a superadmin and open Manage Admins.
2. Enter the person's account email.
3. Wait for the account check.
4. Click Add Admin when the account is eligible.

The account must already exist, be enabled, have a verified
email, and have no existing role record in user_roles.

The server checks the caller's permissions again before saving.
It only grants the `admin` role.

## How to manually add Admins

Firebase Console → Data → user_roles (collection).

1. Click Add document
2. For "Document ID" type person's email

   a. First "Field" type the word "email" in the field, String = [Email of person]

   b. Next "Field" type the word "role", String = [super_admin]

## Server credentials

Adding admins uses Firebase Admin SDK credentials to check
Authentication accounts and create role records.

The endpoint uses Application Default Credentials.
For local development, GOOGLE_APPLICATION_CREDENTIALS can point
to an approved service-account JSON file.

Keep credential files out of Git and Docker images.
AWS needs its own credential setup; local credentials are not
automatically available there.

The results API uses the user's login token instead of an
Admin SDK service-account key.

## How roles are stored

Roles are saved in Firestore under `user_roles`.
Each document is named after the person’s lowercase email.

- Admins need an email and the `admin` role.
- Superadmins also need their account’s UID from Firebase Authentication → Users.

## Firestore rules

The browser loads the role list and removes admin access directly
through Firestore, so both actions require suitable security rules.

Only superadmins should be allowed to list roles or delete
regular admin grants. Browser role creation and updates stay blocked.

The Add Admin server endpoint uses Admin SDK permissions,
so Firestore browser rules do not authorize its writes.

Rules are shared by everyone using the same Firebase project,
regardless of their Git branch.

## What the rules check

- `verified()` checks that the person is signed in and has verified their email.
- `superAdminRecord()` checks their superadmin role and UID.
- `isSuperAdmin()` makes sure both checks pass.

Admins can read their own role. Only superadmins can see the
full list and remove regular admins.

## Where the rules are

Firestore → Rules.
