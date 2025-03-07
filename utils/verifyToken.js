import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
configDotenv();

function profileData(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const verified = jwt.verify(token, process.env.SECRET_KEY);
    req.user = verified;
    res.json({ user: verified });
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
}

export default profileData;
