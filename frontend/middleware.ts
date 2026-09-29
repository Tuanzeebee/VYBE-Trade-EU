import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Bỏ qua API, file tĩnh và nội bộ Next.
  matcher: '/((?!api|_next|_vercel|.*\..*).*)',
};
