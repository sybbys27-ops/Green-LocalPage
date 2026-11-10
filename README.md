<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app
<img width="1278" height="770" alt="image" src="https://github.com/user-attachments/assets/af6eeeb7-a7ec-4792-acd0-811b21b3257e" />


This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/78f5a4aa-4340-43cc-af77-5faeda0abfdc

## Run Locally

**Prerequisites:**  Node.js


Green-LocalPage

React + Express + SQLite 기반 개인 웹페이지/CMS

Frontend
- React
- Vite
- Tailwind

Backend
- Express
- SQLite
- better-sqlite3

Features
- Admin login
- Category/Post management
- Rich text editor
- Image upload
- Visitor statistics
- Likes


## Railway + Volume deployment

This branch keeps SQLite and uploaded images on a Railway persistent Volume.

### Runtime storage

- Local development: `app.db` and `uploads/` remain under the project directory.
- Railway: when `RAILWAY_ENVIRONMENT` is present, runtime data is stored under `/data`.
- SQLite database: `/data/app.db`
- Uploaded images: `/data/uploads/`

### Railway setup

1. Deploy this repository using branch `feat/railway-volume`.
2. Add a Railway Volume to the Green-LocalPage service.
3. Set the Volume mount path to `/data`.
4. Keep the service at one replica because this deployment uses one SQLite database file.
5. Set Healthcheck Path to `/health`.
6. Railway can use the existing package scripts:
   - Build: `npm run build`
   - Start: `npm start`
7. Generate a public domain after deployment.

The server uses Railway's `PORT` automatically. The `/health` endpoint checks that both Express and SQLite are available.

Optional: set `DATA_DIR` explicitly if a different persistent mount path is desired.
