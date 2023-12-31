const crypto = require('crypto');


class AES {

    constructor() {
        this.KEY = crypto
            .createHash('sha512')
            .update(process.env.AES_KEY)
            .digest('hex')
            .substring(0, 32)
        this.algorithm = "aes-256-cbc"
        this.iv = crypto
            .createHash('sha512')
            .update(process.env.IV_KEY)
            .digest('hex')
            .substring(0, 16)
    }


    encrypt(txt) {
        const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.KEY), this.iv);
        let encrypted = cipher.update(txt, 'utf-8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decrypt(txt) {
        const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.KEY), this.iv);
        let decrypted = decipher.update(txt, 'hex', 'utf-8');
        decrypted += decipher.final('utf-8');
        return decrypted;
    }

}


module.exports = AES