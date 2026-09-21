import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'


export class LoginDto {


    @IsEmail()
    @IsNotEmpty()
    email: string


    @IsString()
    password: string


}