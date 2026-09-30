// Tài khoản của tôi (J2): xóa tài khoản bằng ẩn danh hóa. Cần nhập lại mật khẩu vì không hoàn tác được.
import { createApiClient } from './api/client';

export type DeleteOutcome = { ok: true } | { ok: false; error: 'wrong_password' | 'forbidden' | 'network' };

export async function deleteAccount(password: string): Promise<DeleteOutcome> {
  try {
    const { error, response } = await createApiClient().POST('/api/me/delete', { body: { password } });
    if (response.ok) return { ok: true };
    if (response.status === 403) {
      // Sai mật khẩu và tài khoản admin đều 403; phân biệt bằng mã lỗi.
      const code = (error as { error?: { code?: string } } | undefined)?.error?.code;
      return { ok: false, error: code === 'wrong_password' ? 'wrong_password' : 'forbidden' };
    }
    return { ok: false, error: 'network' };
  } catch {
    return { ok: false, error: 'network' };
  }
}
