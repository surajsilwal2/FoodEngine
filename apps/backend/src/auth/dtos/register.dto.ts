import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'


export class RegisterDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    @MinLength(2)
    name: string

    @IsEmail()
    @IsNotEmpty()
    email: string


    @IsString()
    password: string


}