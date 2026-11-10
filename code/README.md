This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Import Georgia food pantries

The pantry importer follows the same workflow as the school and library
importers: it downloads every Georgia `food_pantry` page from FeedAM's bulk
API, transforms each row into the shape used by the pantry dashboard, and
upserts it into the Firestore `pantries` collection.

1. Put the Firebase Admin service-account JSON at
   `code/serviceaccountkey.json` (the file is gitignored).
2. From the `code` directory, run:

```bash
npm run fetch:pantries
```

Firestore document IDs use the stable form `feedam_<resource id>`, so reruns
update records instead of duplicating them. The import preserves FeedAM's
upstream source and last-verification date. Data attribution: Data from Feed
America, [feedam.org](https://feedam.org), EIN 92-1761881 (CC BY 4.0).

## Import NCES school lunch statistics

Export a school-level ELSi CSV or ZIP containing the 12-digit NCES school ID,
free-lunch eligible students, reduced-price eligible students, and the combined
free/reduced count. First run the importer without `--commit` to verify the
source rows and Firestore ID matches:

```bash
npm run import:school-lunch -- /path/to/elsi-export.zip
```

After reviewing the summary, apply the supplemental fields:

```bash
npm run import:school-lunch -- /path/to/elsi-export.zip --commit
```

The importer updates only `lunchStats.*` on existing documents in the
`schools` collection. It does not write `enrollment`, create incomplete school
documents, or replace the rest of a school document. Rows containing NCES
missing/data-quality symbols or non-reconciling totals are skipped.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
