const {PasswordManager} = require("../adapter/utils/password")
const jwt = require("jsonwebtoken")

module.exports = class UsersUseCase{

    constructor(UsersRepo, emailUseCase){
        this.UsersRepo =UsersRepo 
        this.emailUseCase = emailUseCase
        this.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY
    }   


    async signJWTOnSignin(user_id){

        const user = await this.UsersRepo.findOne({where:{user_id}, attributes:["user_id", "is_admin", "face_id_verified"]})

        if (!user){
            return this.throwError("User with this id is not found",404)
        }

        const user_to_enc = {user_id: user.user_id, is_admin: user.is_admin, face_id_verified: user.face_id_verified};

        const token = await jwt.sign({user_to_enc}, this.JWT_SECRET_KEY, {expiresIn: '30m'})

        return {token}
    }

    async createUser(kwargs){

        const hashedPassword = await PasswordManager.hashPassword(kwargs.password)
        kwargs.password = hashedPassword
        kwargs.date_joined = new Date()
        kwargs.is_admin = false
        kwargs.face_id_verified = false

        const user = await this.UsersRepo.create(kwargs)

        return {user_id:user.user_id} 

    }

    async validateUser(kwargs){

        const user = await this.UsersRepo.findOne({
            where:{email: kwargs.email},
            attributes: ["user_id", "email", "password", "phone_number"]
        })

        if(!user){
            return this.throwError("User not found", 404)
        }

        const isPasswordValid = await PasswordManager.comparePassword(kwargs.password, user.password)

        if(!isPasswordValid){
            return this.throwError("Invalid crednitials", 401)
        }

        return {user_id:user.user_id}

    }

    async renewPhoneNumber({user_id, new_phone_number=null, renew=false}){

        const user = await this.UsersRepo.findOne({where: {user_id}, attributes: ["user_id","renew_phone_number", "phone_number"]})

        if(!user){
            return this.throwError("User with id is not found")
        }

        if(renew ){
            if(user.renew_phone_number == null){
                return this.throwError("New phone number is not defined", 400)
            }
            user.phone_number =user.renew_phone_number 
            user.renew_phone_number = null
        } else {
            user.renew_phone_number = new_phone_number
        }

        await this.UsersRepo.save(user)
    }

    async findAllUsers(query){

        const page = Number.isInteger(query.definePage())? query.definePage() : 1
        const offset = (page - 1) * 50;

        const clause = {
            offset,
            limit: 50,
            where: query.defineClause(),
            order: [query.defineSort()],
            attributes: ["user_id", "username", "email", "phone_number" , "is_admin", "date_joined", "last_login", "face_id_verified"]
        }

        const users = await this.UsersRepo.find(clause)

        return users
    }

    async findOneUserById(user_id){

        const clause = {
            where: {user_id},
            attributes: ["user_id", "username", "email", "first_name","last_name","phone_number","date_joined","last_login"]
        }

        const user = await this.UsersRepo.findOne(clause)

        if (!user){
            return this.throwError("User with this id is not found", 404)
        }

        return user

    }

    async findOneUserByUsername(username){

        const clause = {
            where: {username},
            attributes: ["user_id", "username", "email", "first_name","last_name","phone_number","date_joined","last_login"]
        }

        const user = await this.UsersRepo.findOne(clause)

        if (!user){
            return this.throwError("User with this username is not found", 404)
        }

        return user

    }

    async updateUser(kwargs){

        const attrs = ["username", "email", "first_name","last_name"] 

        const clause = {
            where: {user_id:kwargs.user_id},
            attributes: attrs 
        }

        const user = await this.UsersRepo.findOne(clause)

        if (!user){
            return this.throwError("User not found", 404)
        }


        for (const field in kwargs.updateFields) {
            if (!attrs.includes(field)){
                return this.throwError("'"+field+"' field cannot be updated", 400) 
            }
            if (kwargs.updateFields.hasOwnProperty(field) ) {
                user[field] = kwargs.updateFields[field];
            } 
        }

        user["user_id"] = kwargs.user_id

        await this.UsersRepo.save(user)

        return true

    }

    async destroyUser(user_id){

        await this.UsersRepo.destroy({
            where: {user_id}
        })

        return true

    }

    async updatePassword(kwargs){

        const user = await this.UsersRepo.findOne({
            where: {user_id: kwargs.user_id},
            attributes: ["user_id", "password"]
        })

        if (!user){
            return this.throwError("User not found", 404)
        }

        const isPasswordValid = await PasswordManager.comparePassword(kwargs.current_password, user.password)
        
        if(!isPasswordValid){
            return this.throwError("Password is invalid", 401)
        }

        user.password = await PasswordManager.hashPassword(kwargs.new_password)

        await this.UsersRepo.save(user)

        return true

    }


    async sendDeleteAccountToken(user_id){

        const user = await this.UsersRepo.findOne({where:{user_id}, attributes: ['user_id','email']})

        if(!user){
            return this.throwError("User with this id is not found")
        }

        const token = jwt.sign({ user_id_delete_account: user.user_id, delete_account: true }, this.JWT_SECRET_KEY, { expiresIn: '10m' });

        const deleteLink = `http://localhost:${process.env.APP_PORT}/users/delete-account?token=${token}`;

        await this.emailUseCase.sendEmail({to: user.email, message: deleteLink, title: "Delete account"})

        return true

    }


    async validateDeleteAccountToken(token){

        try{
            const decodedToken = jwt.verify(token, this.JWT_SECRET_KEY);
            if(!decodedToken.user_id_delete_account || !decodedToken.delete_account){
                return this.throwError("Invalid delete account token",403)
            }

            return decodedToken.user_id_password
        } catch(err){
            return this.throwError("Invalid delete account token", 403)
        }

    }

    async deleteUserAccount(user_id){

        const user = await this.UsersRepo.findOne({where: {user_id}})

        if(!user){
            return this.throwError("User with this id is not found")
        }

        await this.UsersRepo.destroy({where: {user_id}})
        return true
    }

    async sendPasswordToken(email){

        const user = await this.UsersRepo.findOne({where : {email}, attributes:["user_id","email"]})

        if (!user){
            return this.throwError("User with this email is not found", 404)
        }

        const token = jwt.sign({ user_id: user.user_id_password, reset_password: true }, this.JWT_SECRET_KEY, { expiresIn: '10m' });

        const resetLink = `http://localhost:${process.env.APP_PORT}/users/reset-password?token=${token}`;

        await this.emailUseCase.sendEmail({to: user.email, message: resetLink, title: "Reset password"})

        return true 
    }


    async validatePasswordToken(token){

        try{
            const decodedToken = jwt.verify(token, this.JWT_SECRET_KEY);

            if(!decodedToken.user_id_password || !decodedToken.reset_password){
                return this.throwError("Invalid password token",403)
            }

            return decodedToken.user_id_password
        } catch(err){
            return this.throwError("Invalid password token", 403)
        }

    }


    async resetPassword({user_id, new_password}){

        const user = await this.UsersRepo.findOne({where: {user_id}})

        if(!user){
            return this.throwError("User with this id is not found",404)
        }

        user.password = await PasswordManager.hashPassword(new_password)

        await this.UsersRepo.save(user)

        return true

    }

    throwError(message, status){

        const err = new Error()
        err.name = "USER_USE_CASE_ERROR"
        err.message = message
        err.status = status
        throw err
    }
}