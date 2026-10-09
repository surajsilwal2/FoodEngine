# FoodEngine Admin

Platform administration app for merchant application review and driver verification.

Run the app from the repository root with:

```sh
npm run dev --workspace=web-admin
```

The app uses port `3003` and the API at `NEXT_PUBLIC_API_URL`, defaulting to `https://foodengine-backend-api.onrender.com`. Set `NEXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local` to use a local backend instead.