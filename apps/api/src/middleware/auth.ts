import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@varun/database";

export interface AuthRequest extends Request {
  user?: { id: string; role: string; customerId?: string; staffId?: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      role: string;
      customerId?: string;
      staffId?: string;
    };
    req.user = {
      id: payload.sub,
      role: payload.role,
      customerId: payload.customerId,
      staffId: payload.staffId,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export async function signToken(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { customer: { select: { id: true } }, staff: { select: { id: true } } },
  });

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      customerId: user.customer?.id,
      staffId: user.staff?.id,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "180d" }
  );
}
