import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const user = await this.usersService.create({
      ...registerDto,
      role: (registerDto.role as UserRole) || UserRole.CLIENT,
      status: UserStatus.ACTIVE,
    });

    const { password, ...userWithoutPassword } = user;

    const token = this.generateToken(user);

    return {
      user: {
        ...userWithoutPassword,
        service_desk_id: user.service_desk_ids?.[0] || null,
      },
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const { password, ...userWithoutPassword } = user;

    const token = this.generateToken(user);

    return {
      user: {
        ...userWithoutPassword,
        service_desk_id: user.service_desk_ids?.[0] || null,
      },
      access_token: token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      service_desk_id: user.service_desk_ids?.[0] || null,
    };

    return this.jwtService.sign(payload);
  }
}
