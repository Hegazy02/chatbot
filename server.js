import { PORT } from "./src/config.js";
import app from "./src/app.js";

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
