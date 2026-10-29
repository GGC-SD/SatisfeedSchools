# Manage Admins

Superadmins use this page to view admins and remove their access.
Removing access does not delete the person’s account.

## How to add Superadmins/Admins

Firebase Console → Data → user_roles.

1. Click Add document
2. For "Document ID" type person's email

   a. First "Field" type the word "email" in the field, String = [Email of person]

   b. Next "Field" type the word "role, String = [super_admin/admin]

## Who can use it?

Only superadmins with a verified email and a matching UID.
Admins and members cannot open this page.

## How roles are stored

Roles are saved in Firestore under `user_roles`.
Each document is named after the person’s lowercase email.

- Admins need an email and the `admin` role.
- Superadmins also need their account’s UID.

## What the rules check

- `verified()` checks that the person is signed in and has verified their email.
- `superAdminRecord()` checks their superadmin role and UID.
- `isSuperAdmin()` makes sure both checks pass.

People can read their own role. Only superadmins can see the
full list and remove regular admins.

The page cannot add or edit roles yet, or remove superadmins.

## What’s left

- Add admins from the page.
- Show who changed someone’s access and when.

## Where the rules are

Firebase Console → Firestore Database → Rules.
