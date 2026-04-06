import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // In-memory store for OTPs (In production, use Redis or Firestore with TTL)
  const otpStore = new Map<string, { code: string, expires: number }>();

  app.post("/api/send-otp", (req, res) => {
    const { target, type } = req.body; // target is email or phone
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    otpStore.set(target, { code, expires });
    
    console.log(`[OTP] Sent ${code} to ${target} (${type})`);
    
    // Here you would call your Email/SMS service provider
    // Example: await sendEmail(target, `Your OTP is ${code}`);
    
    res.json({ success: true, message: `OTP sent to ${target}` });
  });

  app.post("/api/verify-otp", (req, res) => {
    const { target, code } = req.body;
    const stored = otpStore.get(target);

    if (stored && stored.code === code && stored.expires > Date.now()) {
      otpStore.delete(target);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }
  });

  // CIN Verification Mock API
  app.post("/api/verify-cin", (req, res) => {
    const { cin } = req.body;
    if (cin && cin.length === 21) {
      res.json({ valid: true, companyName: "Verified Company Ltd." });
    } else {
      res.json({ valid: false, message: "Invalid CIN format" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
