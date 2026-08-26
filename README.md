# CANA Digital Platform

Full-stack platform for CANA Group's public website, customer quotations, and internal operations management.

## Technology

- Client: React, TypeScript, Vite, Tailwind CSS
- Server: Express, TypeScript, MongoDB/Mongoose
- Media uploads: Cloudinary

## Local setup

1. Copy `server/.env.example` to `server/.env` and supply a MongoDB connection string and a strong JWT secret. Cloudinary credentials are needed only when uploading product images.
2. Install dependencies in each app:

   ```sh
   npm install --prefix client
   npm install --prefix server
   ```

3. Start the API and client in separate terminals:

   ```sh
   npm run dev --prefix server
   npm run dev --prefix client
   ```

The website is served at `http://localhost:5173`; Vite forwards `/api` requests to the API at `http://localhost:5050`.

## Checks

```sh
npm run lint --prefix client
npm run build --prefix client
npm run build --prefix server
```

Never commit `server/.env`; it contains private credentials.
