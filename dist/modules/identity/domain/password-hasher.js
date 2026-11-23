import * as argon2 from 'argon2';
export class PasswordHasher {
    static OPTIONS = {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
    };
    static async hash(password) {
        return argon2.hash(password, this.OPTIONS);
    }
    static async verify(hash, password) {
        try {
            return await argon2.verify(hash, password);
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=password-hasher.js.map