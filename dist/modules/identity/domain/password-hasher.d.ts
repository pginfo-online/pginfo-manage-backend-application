export declare class PasswordHasher {
    private static readonly OPTIONS;
    static hash(password: string): Promise<string>;
    static verify(hash: string, password: string): Promise<boolean>;
}
