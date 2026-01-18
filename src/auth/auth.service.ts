import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async registerUser(registerDto: RegisterDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });
    if (user) {
      throw new Error('Este correo ya está registrado.');
    }

    const hash = await bcrypt.hash(registerDto.password, 10);

    return this.prismaService.user.create({
      data: {
        email: registerDto.email,
        password: hash,
        name: registerDto.name,
      },
    });
  }

  async generateTokens(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    const accessToken = this.jwtService.sign(payload);

    // const refreshToken = this.jwtService.sign(payload, {
    //   secret: process.env.JWT_REFRESH_SECRET,
    //   expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    // });

    return {
      accessToken,
      //   refreshToken,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // generar tokens
    const tokens = await this.generateTokens(user.id, user.email);
    // sacar contra de la respuesta
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }
}
