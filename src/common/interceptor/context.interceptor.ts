/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// context.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { requestContext } from './request-context';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    let userId = req?.user?.data?.id ? String(req.user.data.id) : 'guest';
    let role = (req?.user?.data?.role as string | undefined) ?? 'guest';

    // Lấy IP và user-agent
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers['user-agent'] || null;

    // Fallback decode JWT nếu cần
    if ((!req?.user || role === 'guest') && req?.cookies?.token) {
      try {
        const token = String(req.cookies.token);
        const secret = String(process.env.JWT_SECRET);
        const payload = jwt.verify(token, secret) as {
          sub?: string;
          role?: string;
        };
        if (payload?.sub) userId = String(payload.sub);
        if (payload?.role) role = payload.role;
      } catch {
        // token invalid -> giữ mặc định guest
      }
    }

    // 👇 Thêm ip & agent vào context (sử dụng đúng thuộc tính context store)
    return requestContext.run(
      { userId, role, ip_address: ipAddress, user_agent: userAgent },
      () => next.handle(),
    );
  }
}
