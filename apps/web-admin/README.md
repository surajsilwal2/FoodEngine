# FoodEngine Admin

Platform administration app for merchant application review and driver verification.

Run the app from the repository root with:

```sh
npm run dev --workspace=web-admin
```

The app uses port `3003`. The API base URL is the `API_URL` constant in `src/lib/api.ts`, which defaults to `https://foodengine-backend-api.onrender.com`. Change that literal to use a different backend.