import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  registrar(@Body() dto: RegisterDto) {
    return this.authService.registerUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('tokens')
  generateTokens(@Body() body: { userId: string; email: string }) {
    return this.authService.generateTokens(body.userId, body.email);
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  profile(@Req() req) {
    return this.authService.profile(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('profile')
  updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  /** Elimina todos los datos del usuario (gastos, sueldos, notas, snapshots) pero mantiene la cuenta */
  @UseGuards(JwtGuard)
  @Delete('reset-data')
  @HttpCode(200)
  resetData(@Req() req) {
    return this.authService.resetData(req.user.id);
  }

  /** Elimina la cuenta completa del usuario junto con todos sus datos */
  @UseGuards(JwtGuard)
  @Delete('account')
  @HttpCode(200)
  deleteAccount(@Req() req) {
    return this.authService.deleteAccount(req.user.id);
  }
}
