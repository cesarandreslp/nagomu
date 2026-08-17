import dotenv from "dotenv";

// Las pruebas que tocan Postgres necesitan las mismas credenciales que la app.
// Las puramente aritmeticas ignoran esto sin costo.
dotenv.config({ path: [".env.local", ".env"], quiet: true });
