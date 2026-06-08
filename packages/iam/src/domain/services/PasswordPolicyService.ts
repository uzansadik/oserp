import { Password } from '../value-objects/Password';

/**
 * Ham parola politikasını doğrular. Kuralların tek kaynağı `Password` VO'sudur;
 * bu servis uygulama katmanı için ince bir cephe (facade) sağlar.
 */
export class PasswordPolicyService {
  validate(rawPassword: string): void {
    // Geçersizse Password.create hata fırlatır.
    Password.create(rawPassword);
  }

  isValid(rawPassword: string): boolean {
    try {
      Password.create(rawPassword);
      return true;
    } catch {
      return false;
    }
  }
}
