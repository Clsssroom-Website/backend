import bcrypt from "bcryptjs";
export class HashStrategy {
    async hash(data, saltOrRounds = 10) {
        return bcrypt.hash(data, saltOrRounds);
    }
    async compare(data, encrypted) {
        return bcrypt.compare(data, encrypted);
    }
}
